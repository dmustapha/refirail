// File: app/components/RefinanceButton.tsx
"use client";
import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";

export function RefinanceButton({
  txB64, disabled, onDone,
}: { txB64?: string; disabled?: boolean; onDone: (digest: string) => void }) {
  const { mutateAsync, isPending } = useSignAndExecuteTransaction();
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (!txB64) return;
    setErr(null);
    try {
      const tx = Transaction.from(fromBase64(txB64));
      const res = await mutateAsync({ transaction: tx });
      onDone(res.digest);
    } catch (e: any) {
      setErr(e?.message ?? "transaction failed");
    }
  }

  return (
    <div>
      <button className="cta" disabled={disabled || !txB64 || isPending} onClick={run}>
        {isPending ? "Refinancing…" : "Refinance to Suilend"}
      </button>
      {err && <p className="bad">{err}</p>}
    </div>
  );
}
