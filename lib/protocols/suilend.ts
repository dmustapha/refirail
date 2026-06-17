// File: lib/protocols/suilend.ts
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { SuilendClient } from "@suilend/sdk";
import { makeSuiGrpcClient } from "../clients";
import { SUILEND } from "../config";

export async function initSuilend(): Promise<SuilendClient> {
  const grpc = makeSuiGrpcClient();
  // 3.0.x: 4th arg is a SuiGrpcClient, NOT SuiClient.
  return SuilendClient.initialize(
    SUILEND.LENDING_MARKET_ID,
    SUILEND.LENDING_MARKET_TYPE,
    grpc as never,
  );
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
  await client.refreshAll(tx, undefined, [args.collateralType, args.debtType]);

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
