// File: lib/deleverage.ts
// Deleverage = the DeepBook-powered sibling of refinance (DEEPBOOK-DELIBERATION-BRIEF / DELEVERAGE-SCOPE).
// "Reduce my risk": pay down a slice of USDC debt by selling a slice of SUI collateral — in ONE
// atomic PTB, zero upfront capital, reverts if the route can't deliver. DeepBook does BOTH jobs here:
//   • flash-lends the USDC (fee-free SUI_USDC flash — the hero's proven primitive), and
//   • executes the SUI→DEEP→USDC trade through the WHITELISTED fee-free two-hop (spike-proven).
// This is where the order book does real work, so it leads the DeepBook-track pitch. The proven
// cross-protocol refinance (lib/refinance.ts) is untouched.
import { Transaction } from "@mysten/sui/transactions";
import type { SuiClient } from "./clients";
import {
  makeDeepBook,
  appendFlashBorrowUSDC,
  appendFlashRepayUSDC,
  appendSwapSuiToUsdcTwoHop,
} from "./protocols/deepbook";
import { appendNaviOracleRefresh, appendNaviRepayUSDC, appendNaviWithdrawSUI } from "./protocols/navi";
import { addReplayProtectionPrimer } from "./primer";

export interface DeleverageParams {
  sender: string;
  suiClient: SuiClient;
  repayAtomic: bigint; // USDC debt slice to repay (atomic, 6dp)
  collateralAtomic: bigint; // SUI collateral slice to withdraw + sell (atomic, 9dp) — sized from a live DeepBook quote
}

// DeepBook flash USDC → Navi oracle refresh → repay Navi slice → withdraw SUI slice →
// DeepBook two-hop swap SUI→USDC → return flash EXACTLY from the swap → sweep surplus to user.
export async function buildDeleveragePTB(p: DeleverageParams): Promise<Transaction> {
  const repayHuman = Number(p.repayAtomic) / 1e6; // USDC human units ($1 => 1)

  const tx = new Transaction();
  tx.setSender(p.sender);
  const db = makeDeepBook(p.suiClient, p.sender);

  // 1. flash-borrow exactly the debt slice in USDC (fee-free) from DeepBook SUI_USDC.
  const [flashUsdc, flashLoan] = appendFlashBorrowUSDC(db, tx, repayHuman);

  // 1b. DEV-016: refresh Navi's SUI+USDC oracle BEFORE the withdraw, or `withdraw_v2` aborts 1502
  //     on a stale-price race (same root cause the hero refinance fixed).
  await appendNaviOracleRefresh(tx, p.sender);

  // 2. repay the Navi USDC debt slice with the flash proceeds.
  await appendNaviRepayUSDC(tx, flashUsdc, p.repayAtomic);

  // 3. withdraw the freed SUI collateral slice (sized so the swap covers the flash return + surplus).
  const suiCoin = await appendNaviWithdrawSUI(tx, p.collateralAtomic);

  // 4. sell the SUI for USDC via the fee-free two-hop. minOut = repayHuman => the whole tx reverts
  //    atomically if the route can't produce enough USDC to return the flash (the safety guarantee).
  const { usdcOut, suiRemainder, deepRemainders } = appendSwapSuiToUsdcTwoHop(db, tx, suiCoin, repayHuman);

  // 5. return the DeepBook flash EXACTLY from the swapped USDC; surplus USDC comes back to us.
  const surplus = appendFlashRepayUSDC(db, tx, repayHuman, usdcOut, flashLoan);

  // 6. sweep surplus USDC + leftover SUI + DEEP dust back to the user.
  tx.transferObjects([surplus, suiRemainder, ...deepRemainders], p.sender);

  // 7. add one address-owned input so this otherwise shared-only PTB satisfies Sui's replay-protection
  //    rule with a `None` expiration (older wallets cannot parse the ValidDuring variant). See lib/primer.ts.
  await addReplayProtectionPrimer(tx, p.suiClient, p.sender);

  return tx;
}
