// File: lib/refinance.ts
import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "./clients";
import { makeDeepBook, appendFlashBorrowUSDC, appendFlashRepayUSDC } from "./protocols/deepbook";
import { appendNaviRepayUSDC, appendNaviWithdrawSUI, appendNaviOracleRefresh } from "./protocols/navi";
import { initSuilend, appendSuilendDepositBorrow } from "./protocols/suilend";
import { initAlphalend, appendAlphalendDepositBorrow } from "./protocols/alphalend";
import { computeFlashAmounts } from "./amounts";
import { COINS } from "./config";

// Refinance destinations (the money market we move the debt INTO). Source stays Navi.
export type DestId = "suilend" | "alphalend";
export const DESTINATIONS: { id: DestId; name: string }[] = [
  { id: "suilend", name: "Suilend" },
  { id: "alphalend", name: "AlphaLend" },
];

export interface RefinanceParams {
  sender: string;
  suiClient: SuiClient;
  debtAtomic: bigint;        // current Navi USDC debt (atomic), read just before build
  collateralAtomic: bigint;  // SUI collateral to move (atomic)
  bufferBps?: number;        // flash over-borrow buffer; default 30 bps
  destId?: DestId;           // destination money market; default "suilend"
}

// Returns the composed, sender-set PTB. Caller dry-runs it (simulate) before signing.
export async function buildRefinancePTB(p: RefinanceParams): Promise<Transaction> {
  const { flashAtomic, flashHuman } = computeFlashAmounts(p.debtAtomic, p.bufferBps ?? 30);

  const tx = new Transaction();
  tx.setSender(p.sender);

  const destId: DestId = p.destId ?? "suilend";
  const db = makeDeepBook(p.suiClient, p.sender);

  // 1. flash-borrow USDC (fee-free) from DeepBook SUI_USDC (USDC = quote)
  const [flashUsdc, flashLoan] = appendFlashBorrowUSDC(db, tx, flashHuman);

  // 1b. DEV-016: refresh Navi's SUI+USDC oracle prices BEFORE the Navi repay/withdraw, so
  // `incentive_v3::withdraw_v2`'s `calculator::calculate_value` sees fresh prices and does not
  // abort 1502 on a stale-oracle race (see lib/protocols/navi.ts appendNaviOracleRefresh).
  await appendNaviOracleRefresh(tx, p.sender);

  // 2. repay the Navi USDC debt fully with the flash proceeds (excess refunds to sender)
  await appendNaviRepayUSDC(tx, flashUsdc, flashAtomic);

  // 3. withdraw the freed SUI collateral from Navi
  const suiCoin = await appendNaviWithdrawSUI(tx, p.collateralAtomic);

  // 4-7. DESTINATION half (dispatch by id): create position -> deposit SUI -> oracle refresh
  //      -> borrow USDC (== flash amount). Both adapters return { borrowedCoin, cap }.
  const depositArgs = {
    suiCoin,
    collateralType: COINS.SUI,
    debtType: COINS.USDC,
    borrowAtomic: flashAtomic,
    sender: p.sender,
  };
  const { borrowedCoin, cap } =
    destId === "alphalend"
      ? await appendAlphalendDepositBorrow(await initAlphalend(), tx, depositArgs)
      : await appendSuilendDepositBorrow(await initSuilend(), tx, depositArgs);

  // 8. repay the flash loan EXACTLY; remainder coin (dust) returned for sweeping
  const remainder = appendFlashRepayUSDC(db, tx, flashHuman, borrowedCoin, flashLoan);

  // 9. transfer the non-droppable obligation cap to the user (MANDATORY)
  tx.transferObjects([cap], p.sender);

  // 10. sweep any USDC remainder/dust to the user
  tx.transferObjects([remainder], p.sender);

  return tx;
}
