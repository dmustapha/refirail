// File: lib/protocols/deepbook.ts
// DEV-005: `SuiClient` type now comes from ../clients (alias for SuiJsonRpcClient in @mysten/sui@2.18.0).
import type { SuiClient } from "../clients";
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { DeepBookClient } from "@mysten/deepbook-v3";
import { DEEPBOOK } from "../config";

export function makeDeepBook(suiClient: SuiClient, sender: string): DeepBookClient {
  // option is `network`, NOT `env`. Package/registry/pool ids auto-resolve from network.
  return new DeepBookClient({ client: suiClient, address: sender, network: "mainnet" });
}

// Fee-free flash borrow of USDC (quote asset of SUI_USDC). amountHuman is HUMAN units ($1 => 1).
// Returns [borrowedCoin, flashLoan(hot-potato receipt)]. The receipt MUST be returned in the same PTB.
export function appendFlashBorrowUSDC(
  db: DeepBookClient,
  tx: Transaction,
  amountHuman: number,
): [TransactionResult, TransactionResult] {
  const result = tx.add(db.flashLoans.borrowQuoteAsset(DEEPBOOK.POOL_KEY, amountHuman)) as unknown as [
    TransactionResult,
    TransactionResult,
  ];
  return result;
}

// Repay the flash loan EXACTLY. returnQuoteAsset self-splits the repayment from `coin`
// and returns the original coin (with any remainder) for further use.
export function appendFlashRepayUSDC(
  db: DeepBookClient,
  tx: Transaction,
  amountHuman: number,
  coin: TransactionResult,
  flashLoan: TransactionResult,
): TransactionResult {
  return tx.add(
    db.flashLoans.returnQuoteAsset(DEEPBOOK.POOL_KEY, amountHuman, coin, flashLoan),
  ) as unknown as TransactionResult;
}

// FLOOR ONLY: swap SUI (base) -> USDC (quote) through the SUI_USDC pool.
// WARNING: UNVERIFIED method name/shape — confirm against installed @mysten/deepbook-v3
// (likely `db.deepBook.swapExactBaseForQuote({ poolKey, amount, deepAmount, minOut })`).
// See PLAN Phase 2 floor decision tree. Returns [usdcOut, suiRemainder, deepRemainder].
export function appendSwapSuiToUsdc(
  db: DeepBookClient,
  tx: Transaction,
  suiCoin: TransactionResult,
  minUsdcOutHuman = 0,
): TransactionResult {
  const out = tx.add(
    db.deepBook.swapExactBaseForQuote({
      poolKey: DEEPBOOK.POOL_KEY,
      amount: suiCoin,
      deepAmount: 0,
      minOut: minUsdcOutHuman,
    } as never),
  ) as unknown as TransactionResult;
  return out;
}
