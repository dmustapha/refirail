// File: lib/amounts.ts
import { COINS } from "./config";

export function toAtomic(human: number, decimals: number): bigint {
  // avoid float drift: scale via string
  const [whole, frac = ""] = human.toString().split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole + fracPadded);
}

export function toHuman(atomic: bigint, decimals: number): number {
  return Number(atomic) / 10 ** decimals;
}

export const usdcAtomic = (human: number) => toAtomic(human, COINS.USDC_DECIMALS);
export const suiAtomic = (human: number) => toAtomic(human, COINS.SUI_DECIMALS);
export const usdcHuman = (atomic: bigint) => toHuman(atomic, COINS.USDC_DECIMALS);
export const suiHuman = (atomic: bigint) => toHuman(atomic, COINS.SUI_DECIMALS);

// Flash amount must be >= the Navi debt at execution time (debt accrues to the block clock,
// which is slightly later than read time). Borrow a small buffer over the read debt so the
// Navi debt fully clears (enabling full collateral withdrawal). The Suilend borrow == flash
// amount exactly, so the DeepBook return matches borrow_quantity exactly. Default buffer 0.30%.
export function computeFlashAmounts(debtAtomic: bigint, bufferBps = 30) {
  const flashAtomic = debtAtomic + (debtAtomic * BigInt(bufferBps)) / 10000n;
  const flashHuman = usdcHuman(flashAtomic);
  return { flashAtomic, flashHuman };
}
