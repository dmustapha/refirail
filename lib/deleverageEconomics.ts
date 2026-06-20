// File: lib/deleverageEconomics.ts
// Pure deleverage economics — single source of truth for the preview numbers, derived from REAL reads
// (no fabrication). Extracted from app/api/deleverage/route.ts so the formula is unit-testable against
// known values. healthAfter is Navi-side (§7 IMPLEMENTATION-PLAN): the liquidation threshold is
// back-solved from the live health, then re-applied to the post-slice collateral/debt.

export interface DeleverageEconomicsInput {
  collatBeforeUsd: number; // live Navi collateral USD
  debtBeforeUsd: number; // live Navi debt USD
  collatHuman: number; // live collateral amount (SUI)
  suiToSell: number; // sized SUI to withdraw + sell
  repayHuman: number; // sized USDC repay slice
  healthBefore?: number; // live health factor
}

export interface DeleverageEconomics {
  suiPrice: number;
  soldUsd: number;
  collatAfterUsd: number;
  debtAfterUsd: number;
  healthAfter?: number;
}

export function computeDeleverageEconomics(i: DeleverageEconomicsInput): DeleverageEconomics {
  const suiPrice = i.collatHuman > 0 ? i.collatBeforeUsd / i.collatHuman : 0;
  const soldUsd = i.suiToSell * suiPrice;
  const collatAfterUsd = +Math.max(0, i.collatBeforeUsd - soldUsd).toFixed(2);
  const debtAfterUsd = +Math.max(0, i.debtBeforeUsd - i.repayHuman).toFixed(2);
  let healthAfter: number | undefined;
  if (i.healthBefore != null && i.collatBeforeUsd > 0 && debtAfterUsd > 0) {
    const liqThreshold = (i.healthBefore * i.debtBeforeUsd) / i.collatBeforeUsd;
    healthAfter = +((collatAfterUsd * liqThreshold) / debtAfterUsd).toFixed(2);
  }
  return { suiPrice, soldUsd, collatAfterUsd, debtAfterUsd, healthAfter };
}

// Best-execution route choice. We hold no DEEP, so any direct route that charges a DEEP taker fee
// (or is unquotable) is not executable → the fee-free two-hop wins. Only a fee-free, higher-yield
// direct route would beat it.
export function pickBestRoute(
  twoHop: { usdcOut: number; available: boolean },
  direct: { usdcOut: number; deepFee: number; available: boolean },
): "twoHop" | "direct" {
  if (direct.deepFee > 0 || !direct.available) return "twoHop";
  return direct.usdcOut > twoHop.usdcOut ? "direct" : "twoHop";
}
