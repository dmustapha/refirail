// File: lib/types.ts
// Shared types used across API routes, lib, and components.

export interface CoinAmount {
  type: string;
  amountHuman: number;
  usd?: number;
}

// A position read from a single lender (raw, before lender-tagging). Returned by the per-lender readers.
export interface LenderPosition {
  positionId: string;
  collateral?: CoinAmount;
  debt?: CoinAmount;
  borrowAprPct?: number;
  healthFactor?: number;
}

// A position surfaced in the cross-lender picker. `actionable` is true only for the Navi source today
// (the only lender wired into the deleverage/refinance engine); others are read-only.
export interface Position {
  id: string; // "navi:<id>" | "alphalend:<positionId>" | "suilend:<obligationId>"
  protocol: "navi" | "suilend" | "alphalend";
  collateral?: CoinAmount;
  debt?: CoinAmount;
  borrowAprPct?: number;
  healthFactor?: number;
  actionable: boolean;
}

export interface PositionView {
  hasPosition: boolean;
  address: string;
  collateral?: CoinAmount;
  debt?: CoinAmount;
  naviAprPct?: number;
  suilendAprPct?: number;
  alphalendAprPct?: number;
  aprDeltaPct?: number;            // navi - cheapest destination APR (the "you save" against the routed dest)
  recommendedDest?: "suilend" | "alphalend"; // cheapest destination by borrow APR (undefined if Navi is cheapest)
  isNaviCheapest?: boolean;        // true when no destination beats the current Navi rate (F1)
  healthFactor?: number;
  note?: string; // e.g. guidance when no position exists
  // Cross-lender picker (additive; primary fields above stay the actionable Navi position for back-compat).
  positions?: Position[];
  selectedPositionId?: string; // defaults to the primary Navi position id
  positionsNote?: string;      // F7: set when a lender read failed (vs returned empty)
}

export interface BalanceChange {
  coinType: string;
  amount: string; // signed atomic, as string
}

export interface PreviewResult {
  ok: boolean;
  abortReason?: string;
  balanceChanges: BalanceChange[];
  healthAfter?: number;
  naviAprPct?: number;
  suilendAprPct?: number;
  destId?: "suilend" | "alphalend"; // venue the engine routed to (echoed by /api/preview)
  txB64?: string; // serialized PTB for the client to sign (present only when ok)
}

// Deleverage preview — all numbers from live reads + the dryRun (no fabrication).
export interface DeleverageResult {
  ok: boolean;
  abortReason?: string;
  txB64?: string;
  healthBefore?: number;
  healthAfter?: number;
  debtBeforeUsd?: number;
  debtAfterUsd?: number;
  collatBeforeUsd?: number;
  collatAfterUsd?: number;
  suiSold?: number;
  usdcRepaid?: number;
  surplusUsdc?: number;
  route?: string; // e.g. "SUI → DEEP → USDC"
  feeUsd?: number; // 0 on the whitelisted two-hop
}

// Live DeepBook panel data (best-execution route comparison + depth).
export interface DeepBookRouteQuote {
  usdcOut: number;
  deepFee: number;
  available: boolean;
}
export interface DeepBookView {
  midSuiUsdc: number;
  refSui: number; // reference size quoted (e.g. 1 SUI)
  twoHop: DeepBookRouteQuote;
  direct: DeepBookRouteQuote;
  best: "twoHop" | "direct";
  depth: { bids: { price: number; qty: number }[]; asks: { price: number; qty: number }[] };
}
