// File: lib/protocols/navi.ts
import type { Transaction, TransactionResult } from "@mysten/sui/transactions";
import {
  repayCoinPTB,
  withdrawCoinPTB,
  flashloanPTB,
  repayFlashLoanPTB,
  getPool,
  updateOraclePriceBeforeUserOperationPTB,
} from "@naviprotocol/lending";
import { NAVI } from "../config";

// DEV-016 (UNTESTED→fix): the live refinance reverted with Navi `calculator::calculate_value`
// abort 1502 on `incentive_v3::withdraw_v2` (command 2). Reproduced INTERMITTENTLY in dryRun too
// (2 of 3 runs failed with the identical 1502, 1 passed) — i.e. not debt drift, not a structural
// bug, but a Navi ORACLE-STALENESS race: `withdraw_v2` revalues the account against Navi's oracle,
// and aborts when the SUI/USDC price is stale at execution time. Suilend has its own
// `refresh_reserve_price` calls; Navi's withdraw had none. Fix: prepend Navi's own oracle refresh
// (`updateOraclePriceBeforeUserOperationPTB`) for the SUI + USDC pools before the repay/withdraw,
// making `calculate_value` deterministic. Pure prefix calls — no change to the repay/withdraw legs.
export async function appendNaviOracleRefresh(tx: Transaction, sender: string): Promise<void> {
  const suiPool = await getPool(NAVI.SUI_ASSET_ID);
  const usdcPool = await getPool(NAVI.USDC_ASSET_ID);
  await updateOraclePriceBeforeUserOperationPTB(tx as never, sender, [suiPool, usdcPool] as never);
}

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
