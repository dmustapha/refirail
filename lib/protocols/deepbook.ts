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
// DEV-018 (UNTESTED→VERIFIED): swap method shape confirmed against @mysten/deepbook-v3@1.5.0
// (node_modules/.../transactions/deepbook.ts:751 + types SwapParams). Two corrections vs the
// ARCHITECTURE sketch:
//   1. The coin handle goes in `baseCoin` (TransactionObjectArgument), NOT `amount`. `amount`
//      is a numeric quantity the SDK would otherwise use to MINT a fresh base coin via
//      coinWithBalance — passing our withdrawn SUI coin there is the wrong shape. With `baseCoin`
//      supplied, the SDK consumes it directly (amount is ignored for the input coin).
//   2. The call returns THREE results — [baseRemainder, quoteOut(USDC), deepRemainder] — target
//      `pool::swap_exact_base_for_quote`. We hand back the USDC (index 1) plus the leftovers so
//      the caller can repay the flash loan and sweep the dust.
// This is the SECOND DeepBook primitive (a market spot swap), distinct from the hero's fee-free
// flash borrow/return (pool::borrow_flashloan_quote / return_flashloan_quote).
// SUI_USDC is a whitelisted pool → 0 DEEP fee, so deepAmount: 0 (zero-balance DEEP coin) is fine.
export function appendSwapSuiToUsdc(
  db: DeepBookClient,
  tx: Transaction,
  suiCoin: TransactionResult,
  minUsdcOutHuman = 0,
): { usdcOut: TransactionResult; suiRemainder: TransactionResult; deepRemainder: TransactionResult } {
  const [suiRemainder, usdcOut, deepRemainder] = tx.add(
    db.deepBook.swapExactBaseForQuote({
      poolKey: DEEPBOOK.POOL_KEY,
      amount: 0, // unused: baseCoin is supplied, so the SDK does not mint a base coin
      deepAmount: 0, // whitelisted pool → no DEEP fee
      minOut: minUsdcOutHuman,
      baseCoin: suiCoin as never,
    }),
  ) as unknown as [TransactionResult, TransactionResult, TransactionResult];
  return { usdcOut, suiRemainder, deepRemainder };
}
