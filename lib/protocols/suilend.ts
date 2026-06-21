// File: lib/protocols/suilend.ts
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SuilendClient } from "@suilend/sdk";
import { parseObligation } from "@suilend/sdk/parsers/obligation";
import { parseReserve } from "@suilend/sdk/parsers/reserve";
import { makeSuiGrpcClient, makeSuiClient } from "../clients";
import { SUILEND, COINS } from "../config";
import { withRetry } from "../retry";
import type { LenderPosition } from "../types";

export async function initSuilend(): Promise<SuilendClient> {
  // DEV-019: gRPC init intermittently throws "RpcError: fetch failed". Retry the SHARED path so
  // both /api/preview and the scripts survive a transient blip. A fresh grpc client per attempt
  // avoids reusing a half-broken transport.
  return withRetry(() => {
    const grpc = makeSuiGrpcClient();
    // 3.0.x: 4th arg is a SuiGrpcClient, NOT SuiClient.
    return SuilendClient.initialize(
      SUILEND.LENDING_MARKET_ID,
      SUILEND.LENDING_MARKET_TYPE,
      grpc as never,
    );
  });
}

// Create a fresh obligation, deposit the (already-held) SUI coin, refresh BOTH reserve prices,
// then borrow USDC. Returns the borrowed USDC coin and the obligation cap (caller MUST transfer cap).
export async function appendSuilendDepositBorrow(
  client: SuilendClient,
  tx: Transaction,
  args: {
    suiCoin: TransactionResult;
    collateralType: string; // COINS.SUI
    debtType: string;       // COINS.USDC
    borrowAtomic: bigint;   // == flash amount, atomic
    sender: string;
  },
): Promise<{ borrowedCoin: TransactionResult; cap: TransactionResult }> {
  // 1. new obligation -> in-PTB owner cap (non-droppable; transferred by the composer)
  const cap = client.createObligation(tx) as unknown as TransactionResult;

  // 2. deposit the coin we already hold (proceeds of the Navi withdraw)
  client.deposit(args.suiCoin, args.collateralType, cap, tx);

  // 3. Pyth update + refresh BOTH reserves (handles getPriceFeedsUpdateData + updatePriceFeeds + refreshReservePrices)
  // DEV-019: refreshAll hits Pyth's getPackageId, which intermittently throws
  // "Cannot read properties of undefined (reading 'package')" on a transient gRPC blip. Retry the
  // gRPC fetch ONLY — the PTB-mutating effect is idempotent for a fresh tx within buildRefinancePTB's
  // wholesale retry, and a non-transient error still surfaces immediately.
  await withRetry(() => client.refreshAll(tx, undefined, [args.collateralType, args.debtType]));

  // 4. borrow USDC. obligationId "" + addRefreshCalls=false are MANDATORY for a fresh same-PTB obligation.
  const borrowedCoin = (await client.borrow(
    cap,
    "",
    args.debtType,
    args.borrowAtomic.toString(),
    tx,
    false,
  )) as unknown as TransactionResult;

  return { borrowedCoin, cap };
}

// DEV-019: UNWIND an existing Suilend obligation — repay USDC debt then withdraw SUI collateral.
// Used to recover funds the refinance moved into Suilend when there is no longer a need to keep
// the position open (e.g. re-seeding the Navi demo position). Composes into ONE PTB:
//   1. refreshAll (Pyth update + refresh BOTH reserves so withdraw revalues against fresh prices)
//   2. repay the debt with a caller-provided USDC coin (protocol clears up to outstanding, refunds excess)
//   3. withdraw `withdrawCtokenAtomic`? — NO: Suilend `withdraw` takes the cToken-denominated value.
//      We pass the underlying-equivalent value the caller computed; addRefreshCalls=false because
//      step 1 already refreshed in this same PTB.
// Returns the withdrawn SUI coin handle (caller transfers it + the cap back to sender).
export async function appendSuilendRepayWithdraw(
  client: SuilendClient,
  tx: Transaction,
  args: {
    obligationId: string;
    cap: string;            // ObligationOwnerCap object id (owned by sender)
    usdcCoin: TransactionResult; // coin to repay with (the protocol caps at outstanding debt)
    collateralType: string; // COINS.SUI
    debtType: string;       // COINS.USDC
    withdrawCtokenAtomic: bigint; // cToken amount to withdraw (NOT underlying — Suilend withdraw takes cTokens)
  },
): Promise<{ withdrawnCoin: TransactionResult }> {
  // 1. Pyth update + refresh BOTH reserves (same transient-retry rationale as deposit/borrow path).
  await withRetry(() =>
    client.refreshAll(tx, undefined, [args.collateralType, args.debtType]),
  );

  // 2. repay USDC debt (sync; returns the leftover coin which we ignore — caller sweeps wallet dust).
  client.repay(args.obligationId, args.debtType, args.usdcCoin, tx);

  // 3. withdraw SUI collateral cTokens. addRefreshCalls=false — refreshAll above already refreshed.
  const withdrawnCoin = (await client.withdraw(
    args.cap,
    args.obligationId,
    args.collateralType,
    args.withdrawCtokenAtomic.toString(),
    tx,
    false,
  )) as unknown as TransactionResult;

  return { withdrawnCoin };
}

// Read the user's Suilend obligations (for the cross-lender position view). Read-only.
// Enumerate owner caps (cheap; empty for wallets with no Suilend obligations -> early return). Only
// when caps exist do we pay for client init + the parsed reserve map. Each leg is try/caught so any
// parse surprise degrades to "no Suilend positions" rather than breaking the page.
const sNum = (d: unknown): number => Number((d as { toString(): string })?.toString?.() ?? d ?? 0);
const sCoinType = (r: unknown): string =>
  String((r as { name?: string })?.name ?? r ?? "");

export async function getSuilendPositions(address: string): Promise<LenderPosition[]> {
  try {
    const grpc = makeSuiGrpcClient();
    const caps = await withRetry(() =>
      SuilendClient.getObligationOwnerCaps(address, [SUILEND.LENDING_MARKET_TYPE], grpc as never),
    );
    if (!caps || caps.length === 0) return []; // demo wallet + most wallets exit here (one cheap call)

    const client = await initSuilend();
    const reserves: unknown[] = (client as { lendingMarket?: { reserves?: unknown[] } }).lendingMarket?.reserves ?? [];
    const jsonRpc = makeSuiClient();

    // Coin metadata for each reserve (needed by parseReserve). Best-effort per coin.
    const coinMetadataMap: Record<string, unknown> = {};
    for (const r of reserves) {
      const ct = sCoinType((r as { coinType?: unknown })?.coinType);
      if (!ct || coinMetadataMap[ct]) continue;
      try {
        const md = await jsonRpc.getCoinMetadata({ coinType: ct });
        if (md) coinMetadataMap[ct] = md;
      } catch { /* metadata is non-fatal */ }
    }
    const parsedReserveMap: Record<string, unknown> = {};
    for (const r of reserves) {
      const ct = sCoinType((r as { coinType?: unknown })?.coinType);
      if (!ct) continue;
      try { parsedReserveMap[ct] = parseReserve(r as never, coinMetadataMap as never); } catch { /* skip bad reserve */ }
    }

    const out: LenderPosition[] = [];
    for (const cap of caps as Array<{ obligationId?: unknown }>) {
      try {
        const obligationId = String((cap.obligationId as { bytes?: string })?.bytes ?? cap.obligationId ?? "");
        if (!obligationId) continue;
        const obligation = await client.getObligation(obligationId);
        const parsed = parseObligation(obligation as never, parsedReserveMap as never) as {
          id?: string;
          deposits?: Array<{ coinType: string; depositedAmount?: unknown; depositedAmountUsd?: unknown }>;
          borrows?: Array<{ coinType: string; borrowedAmount?: unknown; borrowedAmountUsd?: unknown }>;
          borrowLimitUsd?: unknown; weightedBorrowsUsd?: unknown;
        };
        const suiDep = (parsed.deposits ?? []).find((d) => String(d.coinType).includes("sui::SUI"));
        const usdcBor = (parsed.borrows ?? []).find((b) => String(b.coinType).toLowerCase().includes("usdc"));
        if (!suiDep && !usdcBor) continue;
        const collateral = suiDep
          ? { type: COINS.SUI, amountHuman: +sNum(suiDep.depositedAmount).toFixed(4), usd: +sNum(suiDep.depositedAmountUsd).toFixed(2) }
          : undefined;
        const debt = usdcBor
          ? { type: COINS.USDC, amountHuman: +sNum(usdcBor.borrowedAmount).toFixed(4), usd: +sNum(usdcBor.borrowedAmountUsd).toFixed(2) }
          : undefined;
        const limit = sNum(parsed.borrowLimitUsd);
        const weighted = sNum(parsed.weightedBorrowsUsd);
        const healthFactor = weighted > 0 ? +(limit / weighted).toFixed(2) : undefined;
        out.push({ positionId: parsed.id ?? obligationId, collateral, debt, healthFactor });
      } catch { /* skip unreadable obligation */ }
    }
    return out;
  } catch {
    return [];
  }
}
