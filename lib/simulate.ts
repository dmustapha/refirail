// File: lib/simulate.ts
import type { SuiClient } from "./clients";
import type { Transaction } from "@mysten/sui/transactions";
import type { BalanceChange, PreviewResult } from "./types";

export async function simulateRefinance(
  suiClient: SuiClient,
  tx: Transaction,
  _sender: string,
): Promise<PreviewResult> {
  const bytes = await tx.build({ client: suiClient });
  const res = await suiClient.dryRunTransactionBlock({ transactionBlock: bytes });
  const status = res.effects.status;
  const balanceChanges: BalanceChange[] = (res.balanceChanges ?? []).map((b) => ({
    coinType: b.coinType,
    amount: b.amount,
  }));
  return {
    ok: status.status === "success",
    abortReason: status.error,
    balanceChanges,
  };
}
