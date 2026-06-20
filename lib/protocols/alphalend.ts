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
  await withRetry(() => client.updatePrices(tx, [args.collateralType, args.debtType]));

  // 2. fresh position cap (handle threaded through add_collateral + borrow; transferred by the composer)
  const cap = client.createPosition(tx) as unknown as TransactionResult;

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
    const client = await initAlphalend();
    const markets = await client.getAllMarkets();
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
