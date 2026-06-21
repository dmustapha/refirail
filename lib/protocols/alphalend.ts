// File: lib/protocols/alphalend.ts
// AlphaLend as a refinance DESTINATION (second money-market option beside Suilend).
// Destination half proven in isolation by scripts/spike-alphalend.mjs (dryRun GREEN on mainnet):
//   updatePrices (Pyth, in-PTB) -> create_position -> add_collateral<SUI>
//     -> borrow<USDC> (LiquidityPromise) -> fulfill_promise<USDC> -> coin
// All package/protocol/clock ids come from `client.constants` so they track SDK upgrades.
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { AlphalendClient } from "@alphafi/alphalend-sdk";
import { COINS } from "../config";
import { withRetry } from "../retry";
import { ttlMemo } from "../cache";
import type { LenderPosition } from "../types";

// F9: AlphaLend market list is market-wide + slow-moving → cache 30s (it's hit by the APR read AND
// the position reader on each /api/position).
function cachedMarkets() {
  return ttlMemo("alphalend:markets", 30_000, async () => (await initAlphalend()).getAllMarkets());
}

let _client: AlphalendClient | null = null;
let _marketIds: { sui: string; usdc: string } | null = null;

export async function initAlphalend(): Promise<AlphalendClient> {
  if (!_client) _client = new AlphalendClient("mainnet");
  return _client;
}

// Map coinType -> AlphaLend numeric marketId (SUI=1, USDC=6 at time of writing; resolved live, cached).
async function resolveMarketIds(client: AlphalendClient): Promise<{ sui: string; usdc: string }> {
  if (_marketIds) return _marketIds;
  const markets = await withRetry(() => client.getAllMarkets());
  if (!markets) throw new Error("alphalend: getAllMarkets returned undefined");
  const sui = markets.find((m) => m.coinType.endsWith("::sui::SUI"));
  const usdc = markets.find((m) => m.coinType === COINS.USDC);
  if (!sui || !usdc) throw new Error("alphalend: SUI/USDC markets not found");
  _marketIds = { sui: sui.marketId, usdc: usdc.marketId };
  return _marketIds;
}

// Create a fresh position, deposit the (already-held) SUI coin, refresh BOTH oracle prices, then
// borrow EXACTLY borrowAtomic USDC. Returns the borrowed USDC coin + the position cap.
// Caller MUST transfer the cap (non-droppable). Mirrors appendSuilendDepositBorrow.
export async function appendAlphalendDepositBorrow(
  client: AlphalendClient,
  tx: Transaction,
  args: {
    suiCoin: TransactionResult;
    collateralType: string; // COINS.SUI
    debtType: string;       // COINS.USDC
    borrowAtomic: bigint;   // == flash amount, atomic
    sender: string;
  },
): Promise<{ borrowedCoin: TransactionResult; cap: TransactionResult }> {
  const { sui: suiMarketId, usdc: usdcMarketId } = await resolveMarketIds(client);
  const c = client.constants;
  const PKG = c.ALPHALEND_LATEST_PACKAGE_ID;
  const PROTOCOL = c.LENDING_PROTOCOL_ID;
  const CLOCK = c.SUI_CLOCK_OBJECT_ID;

  // 1. oracle refresh for BOTH assets, in-PTB, BEFORE borrow (the proven ordering; retry transient Pyth/gRPC blips).
  // `tx as never`: the AlphaLend SDK types its Transaction param against a nested @mysten/sui (via the
  // Cetus aggregator), which is nominally distinct from our 2.19 Transaction (#private brand) but
  // structurally identical at runtime. The cast bypasses the cross-copy type clash.
  await withRetry(() => client.updatePrices(tx as never, [args.collateralType, args.debtType]));

  // 2. fresh position cap (handle threaded through add_collateral + borrow; transferred by the composer)
  const cap = client.createPosition(tx as never) as unknown as TransactionResult;

  // 3. deposit the SUI coin we already hold (proceeds of the Navi withdraw)
  tx.moveCall({
    target: `${PKG}::alpha_lending::add_collateral`,
    typeArguments: [args.collateralType],
    arguments: [tx.object(PROTOCOL), cap, tx.pure.u64(suiMarketId), args.suiCoin, tx.object(CLOCK)],
  });

  // 4. borrow EXACTLY borrowAtomic USDC -> LiquidityPromise
  const promise = tx.moveCall({
    target: `${PKG}::alpha_lending::borrow`,
    typeArguments: [args.debtType],
    arguments: [tx.object(PROTOCOL), cap, tx.pure.u64(usdcMarketId), tx.pure.u64(args.borrowAtomic), tx.object(CLOCK)],
  });

  // 5. fulfill the promise -> the borrowed USDC coin (repays the flash in the composer)
  const borrowedCoin = tx.moveCall({
    target: `${PKG}::alpha_lending::fulfill_promise`,
    typeArguments: [args.debtType],
    arguments: [tx.object(PROTOCOL), promise, tx.object(CLOCK)],
  }) as unknown as TransactionResult;

  return { borrowedCoin, cap };
}

// Native-USDC borrow APR (%), like-for-like with naviUsdcBorrowApr / suilendUsdcBorrowApr.
// MarketData.borrowApr.interestApr is a ratio (0.065 = 6.5%); normalize to a percentage.
export async function alphalendUsdcBorrowApr(): Promise<number | undefined> {
  try {
    const markets = await cachedMarkets();
    const usdc = markets?.find((m) => m.coinType === COINS.USDC);
    const raw = usdc?.borrowApr?.interestApr;
    if (raw == null) return undefined;
    const v = Number(raw.toString());
    if (!Number.isFinite(v)) return undefined;
    return +(v < 1 ? v * 100 : v).toFixed(2);
  } catch {
    return undefined;
  }
}

// Read the user's AlphaLend positions (for the cross-lender position view). Read-only.
// getUserPortfolio returns per-position suppliedAmounts/borrowedAmounts maps (marketId -> Decimal,
// already human units); map marketId -> coinType/price via getAllMarkets. Health = safe-limit / debt.
const num = (d: unknown): number => Number((d as { toString(): string })?.toString?.() ?? d ?? 0);

// Returns [] when the user has no AlphaLend position, null when the READ itself failed (so the UI can
// say "couldn't read AlphaLend" instead of silently implying no position). F7.
export async function getAlphalendPositions(address: string): Promise<LenderPosition[] | null> {
  try {
    const client = await initAlphalend();
    const portfolios = await withRetry(() => client.getUserPortfolio(address));
    if (!portfolios || portfolios.length === 0) return [];
    const markets = await cachedMarkets();
    if (!markets) return null; // portfolios read but markets failed -> a read failure, not "no position"
    const marketById = new Map<number, { coinType: string; price: number }>();
    for (const m of markets) marketById.set(parseInt(m.marketId), { coinType: m.coinType, price: num(m.price) });

    const out: LenderPosition[] = [];
    for (const pf of portfolios) {
      let collateral: LenderPosition["collateral"];
      let debt: LenderPosition["debt"];
      for (const [marketId, amt] of pf.suppliedAmounts) {
        const m = marketById.get(marketId);
        if (!m) continue;
        const amountHuman = num(amt);
        if (amountHuman <= 0) continue;
        const entry = { type: m.coinType, amountHuman: +amountHuman.toFixed(4), usd: +(amountHuman * m.price).toFixed(2) };
        if (m.coinType.endsWith("::sui::SUI")) collateral = { ...entry, type: COINS.SUI };
        else if (!collateral) collateral = entry;
      }
      for (const [marketId, amt] of pf.borrowedAmounts) {
        const m = marketById.get(marketId);
        if (!m) continue;
        const amountHuman = num(amt);
        if (amountHuman <= 0) continue;
        const entry = { type: m.coinType, amountHuman: +amountHuman.toFixed(4), usd: +(amountHuman * m.price).toFixed(2) };
        if (m.coinType === COINS.USDC || m.coinType.endsWith("::usdc::USDC")) debt = { ...entry, type: COINS.USDC };
        else if (!debt) debt = entry;
      }
      if (!collateral && !debt) continue;
      const borrowedUsd = num(pf.totalBorrowedUsd);
      const safeLimit = num(pf.safeBorrowLimit);
      const healthFactor = borrowedUsd > 0 ? +(safeLimit / borrowedUsd).toFixed(2) : undefined;
      const aggApr = num(pf.aggregatedBorrowApr);
      const borrowAprPct = +(aggApr < 1 ? aggApr * 100 : aggApr).toFixed(2);
      out.push({ positionId: String(pf.positionId), collateral, debt, borrowAprPct, healthFactor });
    }
    return out;
  } catch {
    return null; // read failed (F7)
  }
}
