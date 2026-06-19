// File: lib/deleverageQuote.ts
// Size a deleverage from a LIVE DeepBook two-hop quote (honest, real-data — no fabricated amounts).
// Given the current USDC debt + a fraction, compute the repay slice and the SUI collateral to
// withdraw+sell so the swap covers the flash return with a small surplus. minOut is enforced on-chain
// (= the repay amount) so any drift between quote and execution reverts the whole tx atomically.
import type { DeepBookClient } from "@mysten/deepbook-v3";

export const MIN_SUI_SELL = 0.35; // two-hop liquidity floor (getQuantityOut errors below ~0.3 SUI)
const SURPLUS = 1.05; // target swap output = repay × 1.05 (so the flash return can never underflow)
const SLIPPAGE_PAD = 1.02; // size the SUI input a touch high to absorb slippage

export interface DeleverageSize {
  ok: boolean;
  reason?: string;
  repayAtomic: bigint;
  collateralAtomic: bigint;
  repayHuman: number;
  suiToSell: number;
  quotedUsdcOut: number;
  effPricePerSui: number; // USDC per 1 SUI via the two-hop route
}

const EMPTY = {
  repayAtomic: 0n,
  collateralAtomic: 0n,
  repayHuman: 0,
  suiToSell: 0,
  quotedUsdcOut: 0,
  effPricePerSui: 0,
};

export async function sizeDeleverage(
  db: DeepBookClient,
  debtAtomic: bigint,
  fraction: number,
  availableCollateralSui?: number,
): Promise<DeleverageSize> {
  if (!(fraction > 0 && fraction <= 0.9)) {
    return { ok: false, reason: "fraction must be in (0, 0.9]", ...EMPTY };
  }
  const repayAtomic = BigInt(Math.floor(Number(debtAtomic) * fraction));
  const repayHuman = Number(repayAtomic) / 1e6;
  if (repayHuman <= 0) return { ok: false, reason: "debt too small to deleverage", ...EMPTY };

  // Effective two-hop price: quote 1 SUI → USDC through DEEP_SUI then DEEP_USDC.
  const h1 = await db.getQuantityOut("DEEP_SUI", 0, 1); // sell 1 SUI (quote) → DEEP (base)
  const h2 = await db.getQuantityOut("DEEP_USDC", h1.baseOut, 0); // sell DEEP (base) → USDC (quote)
  const usdcPerSui = h2.quoteOut;
  if (!(usdcPerSui > 0)) return { ok: false, reason: "no DeepBook route liquidity", ...EMPTY };

  let suiToSell = ((repayHuman * SURPLUS) / usdcPerSui) * SLIPPAGE_PAD;
  if (suiToSell < MIN_SUI_SELL) suiToSell = MIN_SUI_SELL; // honor the two-hop floor
  suiToSell = +suiToSell.toFixed(6);

  if (availableCollateralSui != null && suiToSell > availableCollateralSui) {
    return { ok: false, reason: "position too small for this %", ...EMPTY, repayAtomic, repayHuman };
  }

  // Refinement quote at the sized SUI → the USDC we actually expect (display only; on-chain minOut guards).
  const c1 = await db.getQuantityOut("DEEP_SUI", 0, suiToSell);
  const c2 = await db.getQuantityOut("DEEP_USDC", c1.baseOut, 0);

  return {
    ok: true,
    repayAtomic,
    collateralAtomic: BigInt(Math.ceil(suiToSell * 1e9)),
    repayHuman,
    suiToSell,
    quotedUsdcOut: c2.quoteOut,
    effPricePerSui: usdcPerSui,
  };
}
