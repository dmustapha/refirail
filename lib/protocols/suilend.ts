// File: lib/protocols/suilend.ts
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SuilendClient } from "@suilend/sdk";
import { makeSuiGrpcClient } from "../clients";
import { SUILEND } from "../config";
import { withRetry } from "../retry";

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
