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
