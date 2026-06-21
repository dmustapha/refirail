// File: lib/protocols/suilend.ts
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SuilendClient } from "@suilend/sdk";
import { makeSuiGrpcClient, makeSuiClient } from "../clients";
import { makeDeepBook } from "./deepbook";
import { SUILEND, COINS } from "../config";
import { withRetry } from "../retry";
import { ttlMemo } from "../cache";
import type { LenderPosition } from "../types";

// Memoized: the gRPC init is ~12s cold, so reuse the initialized client across requests (warm() pre-warms
// it on the first request, and the cross-lender scan runs on every /api/position). Reset on INIT failure
// so a transient "RpcError: fetch failed" blip is never cached. DEV-019: fresh grpc client per attempt.
let _suilend: Promise<SuilendClient> | null = null;
export function initSuilend(): Promise<SuilendClient> {
  if (!_suilend) {
    _suilend = withRetry(() => {
      const grpc = makeSuiGrpcClient();
      // 3.0.x: 4th arg is a SuiGrpcClient, NOT SuiClient.
      return SuilendClient.initialize(SUILEND.LENDING_MARKET_ID, SUILEND.LENDING_MARKET_TYPE, grpc as never);
    }).catch((e) => {
      _suilend = null; // don't cache a failed init
      throw e;
    });
  }
  return _suilend;
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

// Read the user's Suilend obligations for the cross-lender view (read-only). The SDK's
// parseObligation/parseReserve layer needs full metadata for all ~45 reserves (fails on exotic coins)
// and has coinType-form mismatches, so we bypass it: getObligation returns the raw obligation, which
// carries per-asset USD `marketValue` + the health inputs as on-chain Decimals (WAD-scaled, /1e18).
// Token amounts are derived from the live SUI spot (display only). Empty/throw -> [] (graceful).
const wad = (d: unknown): number => {
  const v = (d as { value?: string | number })?.value;
  try { return v != null ? Number(BigInt(v)) / 1e18 : 0; } catch { return 0; }
};
const ctName = (ct: unknown): string => String((ct as { name?: string })?.name ?? ct ?? "");

// Returns [] when the user has no Suilend obligation, null when the READ itself failed (F7).
export async function getSuilendPositions(address: string): Promise<LenderPosition[] | null> {
  try {
    const grpc = makeSuiGrpcClient();
    const caps = await withRetry(() =>
      SuilendClient.getObligationOwnerCaps(address, [SUILEND.LENDING_MARKET_TYPE], grpc as never),
    );
    if (!caps || caps.length === 0) return []; // cheap exit: most wallets have no Suilend obligation

    const client = await initSuilend();
    let suiPrice = 0.71; // fallback; convert the on-chain USD marketValue into a SUI amount for display
    try { suiPrice = await ttlMemo("price:sui", 20_000, () => makeDeepBook(makeSuiClient(), address).midPrice("SUI_USDC")); } catch { /* fallback */ }

    const out: LenderPosition[] = [];
    for (const cap of caps as Array<{ obligationId?: { bytes?: string } | string }>) {
      try {
        const oid = String((cap.obligationId as { bytes?: string })?.bytes ?? cap.obligationId ?? "");
        if (!oid) continue;
        const ob = (await client.getObligation(oid)) as unknown as {
          deposits?: Array<{ coinType: unknown; marketValue?: unknown }>;
          borrows?: Array<{ coinType: unknown; marketValue?: unknown }>;
          depositedValueUsd?: unknown; unweightedBorrowedValueUsd?: unknown;
          weightedBorrowedValueUsd?: unknown; unhealthyBorrowValueUsd?: unknown;
        };
        const suiDep = (ob.deposits ?? []).find((d) => ctName(d.coinType).includes("sui::SUI"));
        const usdcBor = (ob.borrows ?? []).find((b) => ctName(b.coinType).toLowerCase().includes("usdc"));
        const collatUsd = suiDep ? wad(suiDep.marketValue) : wad(ob.depositedValueUsd);
        const debtUsd = usdcBor ? wad(usdcBor.marketValue) : wad(ob.unweightedBorrowedValueUsd);
        if (collatUsd < 0.05 && debtUsd < 0.05) continue; // skip dust obligations
        const weighted = wad(ob.weightedBorrowedValueUsd);
        const healthFactor = weighted > 0 ? +(wad(ob.unhealthyBorrowValueUsd) / weighted).toFixed(2) : undefined;
        const collateral = suiDep && suiPrice > 0
          ? { type: COINS.SUI, amountHuman: +(collatUsd / suiPrice).toFixed(4), usd: +collatUsd.toFixed(2) }
          : undefined;
        const debt = usdcBor ? { type: COINS.USDC, amountHuman: +debtUsd.toFixed(4), usd: +debtUsd.toFixed(2) } : undefined;
        if (!collateral && !debt) continue;
        out.push({ positionId: oid, collateral, debt, healthFactor });
      } catch { /* skip unreadable obligation */ }
    }
    return out;
  } catch {
    return null; // read failed (F7)
  }
}
