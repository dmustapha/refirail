// File: lib/deleverage.ts
// FLOOR backstop (ARCHITECTURE.md §9): Navi-only one-click deleverage in a single PTB.
// Insurance/completeness — the hero cross-protocol refinance is the demo. This floor also makes
// RefiRail's DeepBook track claim honest with TWO primitives: the hero's fee-free flash borrow/
// return (pool::borrow_flashloan_quote / return_flashloan_quote) PLUS a market spot swap here
// (pool::swap_exact_base_for_quote via appendSwapSuiToUsdc).
import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "./clients";
import type { TransactionResult } from "@mysten/sui/transactions";
import { makeDeepBook, appendSwapSuiToUsdc } from "./protocols/deepbook";
import {
  appendNaviFlashBorrowUSDC,
  appendNaviFlashRepayUSDC,
  appendNaviRepayUSDC,
  appendNaviWithdrawSUI,
} from "./protocols/navi";
import { COINS } from "./config";

export interface DeleverageParams {
  sender: string;
  suiClient: SuiClient;
  repayAtomic: bigint; // USDC debt slice to repay (atomic)
  collateralAtomic: bigint; // SUI collateral slice to withdraw + swap (atomic)
  bufferBps?: number; // covers Navi 0.06% flash fee + swap slippage
}

// Navi flash USDC -> repay Navi -> withdraw SUI slice -> swap SUI->USDC (DeepBook) -> repay flash.
export async function buildDeleveragePTB(p: DeleverageParams): Promise<Transaction> {
  const fee = (p.repayAtomic * BigInt(p.bufferBps ?? 60)) / 10000n;
  const flashAtomic = p.repayAtomic + fee;

  const tx = new Transaction();
  tx.setSender(p.sender);
  const db = makeDeepBook(p.suiClient, p.sender);

  // 1. flash-borrow USDC from Navi
  const [flashBal, receipt] = await appendNaviFlashBorrowUSDC(tx, flashAtomic);
  // Balance -> Coin
  const flashUsdc = tx.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [COINS.USDC],
    arguments: [flashBal],
  }) as unknown as TransactionResult;

  // 2. repay Navi debt slice with flash proceeds
  await appendNaviRepayUSDC(tx, flashUsdc, p.repayAtomic);

  // 3. withdraw the SUI collateral slice
  const suiCoin = await appendNaviWithdrawSUI(tx, p.collateralAtomic);

  // 4. swap SUI -> USDC via DeepBook to obtain repayment for the flash loan
  //    (DEV-018: swap returns 3 handles — quoteOut(USDC) repays the flash; the SUI/DEEP
  //    remainders are swept back to the user below.)
  const { usdcOut, suiRemainder, deepRemainder } = appendSwapSuiToUsdc(db, tx, suiCoin);

  // 5. repay the Navi flash loan (principal + fee) from the swapped USDC
  const surplus = await appendNaviFlashRepayUSDC(tx, receipt, usdcOut);

  // 6. sweep surplus + swap remainders to the user
  tx.transferObjects([surplus, suiRemainder, deepRemainder], p.sender);
  return tx;
}
