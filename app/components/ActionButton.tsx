// File: app/components/ActionButton.tsx
// Shared signer for both operations. Signs any server-built txB64 with the connected wallet.
"use client";
import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";

export function ActionButton({
  txB64,
  disabled,
  label,
  pendingLabel,
  onDone,
  block,
}: {
  txB64?: string;
  disabled?: boolean;
  label: string;
  pendingLabel: string;
  onDone: (digest: string) => void;
  block?: boolean;
}) {
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
      <button
        className={`btn btn-primary${block ? " btn-block" : ""}`}
        disabled={disabled || !txB64 || isPending}
        onClick={run}
      >
        {isPending ? pendingLabel : label}
      </button>
      {err && <p className="muted-note" style={{ color: "var(--danger)" }}>{err}</p>}
    </div>
  );
}
