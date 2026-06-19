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

// DIRECT route reference (NOT used in execution — kept for the best-execution route comparison).
// DEV-018 CORRECTION (spike 2026-06-19): the prior claim "SUI_USDC is a whitelisted pool → 0 DEEP
// fee" is FALSE. The on-chain spike proved `whitelisted("SUI_USDC") === false`; a direct SUI→USDC
// swap therefore charges a taker fee payable in DEEP (e.g. ~0.0084 DEEP per 1 SUI), which the demo
// wallet does NOT hold — so this path would abort live. We execute the fee-free two-hop below
// instead. This direct builder is retained only so the router can quote/compare it for display.
export function appendSwapSuiToUsdcDirect(
  db: DeepBookClient,
  tx: Transaction,
  suiCoin: TransactionResult,
  minUsdcOutHuman = 0,
): { usdcOut: TransactionResult; suiRemainder: TransactionResult; deepRemainder: TransactionResult } {
  const [suiRemainder, usdcOut, deepRemainder] = tx.add(
    db.deepBook.swapExactBaseForQuote({
      poolKey: DEEPBOOK.POOL_KEY,
      amount: 0, // unused: baseCoin is supplied, so the SDK does not mint a base coin
      deepAmount: 0, // NOTE: SUI_USDC is NOT whitelisted → a real DEEP fee is required here
      minOut: minUsdcOutHuman,
      baseCoin: suiCoin as never,
    }),
  ) as unknown as [TransactionResult, TransactionResult, TransactionResult];
  return { usdcOut, suiRemainder, deepRemainder };
}

// EXECUTABLE route: fee-free SUI → DEEP → USDC two-hop through the WHITELISTED DEEP pairs.
// Spike-proven (2026-06-19): DEEP_SUI + DEEP_USDC are both whitelisted (deepRequired === 0), the
// two-hop dryRuns green standalone AND alongside the flash loan, slippage <2% at ≥0.5 SUI.
//   hop 1 (DEEP_SUI, base=DEEP quote=SUI): sell SUI(quote) → DEEP(base). Our withdrawn SUI coin
//          goes in `quoteCoin` (the SDK consumes it; `amount` is ignored). Returns
//          [deepOut(base), suiRemainder(quote), deepDust].
//   hop 2 (DEEP_USDC, base=DEEP quote=USDC): sell DEEP(base) → USDC(quote). The hop-1 DEEP goes in
//          `baseCoin`. minOut(USDC) is enforced HERE so the whole tx reverts atomically if the
//          route can't deliver enough USDC (this is the deleverage safety guarantee).
//          Returns [deepRemainder, usdcOut(quote), deepDust2].
// usdcOut repays the flash; the SUI/DEEP remainders are swept back to the user by the caller.
export function appendSwapSuiToUsdcTwoHop(
  db: DeepBookClient,
  tx: Transaction,
  suiCoin: TransactionResult,
  minUsdcOutHuman = 0,
): { usdcOut: TransactionResult; suiRemainder: TransactionResult; deepRemainders: TransactionResult[] } {
  const [deepOut, suiRemainder, deepDust1] = tx.add(
    db.deepBook.swapExactQuoteForBase({
      poolKey: "DEEP_SUI",
      amount: 0, // unused: quoteCoin is supplied
      deepAmount: 0, // whitelisted → no DEEP fee
      minOut: 0, // intermediate hop; the USDC floor is enforced on hop 2
      quoteCoin: suiCoin as never,
    }),
  ) as unknown as [TransactionResult, TransactionResult, TransactionResult];

  const [deepRemainder, usdcOut, deepDust2] = tx.add(
    db.deepBook.swapExactBaseForQuote({
      poolKey: "DEEP_USDC",
      amount: 0, // unused: baseCoin is supplied
      deepAmount: 0, // whitelisted → no DEEP fee
      minOut: minUsdcOutHuman, // atomic safety: revert if the route underdelivers USDC
      baseCoin: deepOut as never,
    }),
  ) as unknown as [TransactionResult, TransactionResult, TransactionResult];

  return { usdcOut, suiRemainder, deepRemainders: [deepDust1, deepRemainder, deepDust2] };
}
