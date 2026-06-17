// File: lib/protocols/navi.ts
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import {
  repayCoinPTB,
  withdrawCoinPTB,
  flashloanPTB,
  repayFlashLoanPTB,
} from "@naviprotocol/lending";
import { NAVI } from "../config";

// DEV-006 (COSMETIC): @naviprotocol/lending@1.4.6 bundles its OWN nested @mysten/sui@1.45.2 (v1 API),
// whose `Transaction` is nominally distinct from our root @mysten/sui@2.18.0 `Transaction`
// (private-field brand mismatch). The runtime PTB-builder object is structurally identical, so the
// `tx` argument is cast through `as never` at each helper boundary — type-only, zero functional effect.
// (Coin/receipt handles already round-trip via the existing `as unknown as TransactionResult` casts.)

// Repay Navi USDC debt with a coin handle (the flash proceeds). assetId 10 = native USDC.
// `amount` (atomic) caps the repay; Navi clears up to the outstanding debt and refunds excess.
export async function appendNaviRepayUSDC(
  tx: Transaction,
  usdcCoin: TransactionResult,
  repayAtomic: bigint,
): Promise<void> {
  await repayCoinPTB(tx as never, NAVI.USDC_ASSET_ID, usdcCoin as never, { amount: Number(repayAtomic) });
}

// Withdraw SUI collateral. assetId 0 = SUI. Returns a chainable SUI coin handle.
export async function appendNaviWithdrawSUI(
  tx: Transaction,
  collateralAtomic: bigint,
): Promise<TransactionResult> {
  const suiCoin = (await withdrawCoinPTB(
    tx as never,
    NAVI.SUI_ASSET_ID,
    Number(collateralAtomic),
  )) as unknown as TransactionResult;
  return suiCoin;
}

// FLOOR: Navi flash loan of USDC. Returns [balance, receipt(hot-potato)].
export async function appendNaviFlashBorrowUSDC(
  tx: Transaction,
  amountAtomic: bigint,
): Promise<[TransactionResult, TransactionResult]> {
  const res = (await flashloanPTB(tx as never, NAVI.USDC_ASSET_ID, Number(amountAtomic))) as unknown as [
    TransactionResult,
    TransactionResult,
  ];
  return res;
}

// FLOOR: repay the Navi flash loan. coinObject must cover principal + 0.06% fee.
export async function appendNaviFlashRepayUSDC(
  tx: Transaction,
  receipt: TransactionResult,
  coinObject: TransactionResult,
): Promise<TransactionResult> {
  const [surplus] = (await repayFlashLoanPTB(
    tx as never,
    NAVI.USDC_ASSET_ID,
    receipt as never,
    coinObject as never,
  )) as unknown as [TransactionResult];
  return surplus;
}
