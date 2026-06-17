// File: lib/refinance.ts
import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "./clients";
import { makeDeepBook, appendFlashBorrowUSDC, appendFlashRepayUSDC } from "./protocols/deepbook";
import { appendNaviRepayUSDC, appendNaviWithdrawSUI } from "./protocols/navi";
import { initSuilend, appendSuilendDepositBorrow } from "./protocols/suilend";
import { computeFlashAmounts } from "./amounts";
import { COINS } from "./config";

export interface RefinanceParams {
  sender: string;
  suiClient: SuiClient;
  debtAtomic: bigint;        // current Navi USDC debt (atomic), read just before build
  collateralAtomic: bigint;  // SUI collateral to move (atomic)
  bufferBps?: number;        // flash over-borrow buffer; default 30 bps
}

// Returns the composed, sender-set PTB. Caller dry-runs it (simulate) before signing.
export async function buildRefinancePTB(p: RefinanceParams): Promise<Transaction> {
  const { flashAtomic, flashHuman } = computeFlashAmounts(p.debtAtomic, p.bufferBps ?? 30);

  const tx = new Transaction();
  tx.setSender(p.sender);

  const db = makeDeepBook(p.suiClient, p.sender);
  const suilend = await initSuilend();

  // 1. flash-borrow USDC (fee-free) from DeepBook SUI_USDC (USDC = quote)
  const [flashUsdc, flashLoan] = appendFlashBorrowUSDC(db, tx, flashHuman);

  // 2. repay the Navi USDC debt fully with the flash proceeds (excess refunds to sender)
  await appendNaviRepayUSDC(tx, flashUsdc, flashAtomic);

  // 3. withdraw the freed SUI collateral from Navi
  const suiCoin = await appendNaviWithdrawSUI(tx, p.collateralAtomic);

  // 4-7. Suilend: createObligation -> deposit SUI -> refreshAll -> borrow USDC (== flash amount)
  const { borrowedCoin, cap } = await appendSuilendDepositBorrow(suilend, tx, {
    suiCoin,
    collateralType: COINS.SUI,
    debtType: COINS.USDC,
    borrowAtomic: flashAtomic,
    sender: p.sender,
  });

  // 8. repay the flash loan EXACTLY; remainder coin (dust) returned for sweeping
  const remainder = appendFlashRepayUSDC(db, tx, flashHuman, borrowedCoin, flashLoan);

  // 9. transfer the non-droppable obligation cap to the user (MANDATORY)
  tx.transferObjects([cap], p.sender);

  // 10. sweep any USDC remainder/dust to the user
  tx.transferObjects([remainder], p.sender);

  return tx;
}
