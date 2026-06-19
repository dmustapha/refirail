// File: lib/types.ts
// Shared types used across API routes, lib, and components.

export interface CoinAmount {
  type: string;
  amountHuman: number;
  usd?: number;
}

export interface PositionView {
  hasPosition: boolean;
  address: string;
  collateral?: CoinAmount;
  debt?: CoinAmount;
  naviAprPct?: number;
  suilendAprPct?: number;
  aprDeltaPct?: number;
  healthFactor?: number;
  note?: string; // e.g. guidance when no position exists
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
