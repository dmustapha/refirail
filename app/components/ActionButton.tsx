// File: app/components/ActionButton.tsx
// Shared signer for both operations. Signs any server-built txB64 with the connected wallet.
"use client";
import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

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
  const client = useSuiClient();
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (!txB64) return;
    setErr(null);
    try {
      // txB64 carries the SERIALIZED transaction (tx.serialize() JSON), not built bytes. Built bytes
      // trip dapp-kit's wallet-standard validation ("Invalid type: Expected Object but received
      // Object"); a serialized intent lets the wallet build + sign it itself.
      const tx = Transaction.from(txB64);
      const res = await mutateAsync({ transaction: tx });
      // The wallet resolves with a digest the moment it SUBMITS, even if the transaction reverts
      // on-chain. Confirm the canonical effects before declaring success, so a revert never shows
      // a false "Done" card.
      setConfirming(true);
      const fx = await client.waitForTransaction({
        digest: res.digest,
        options: { showEffects: true },
      });
      const status = fx.effects?.status?.status;
      if (status !== "success") {
        throw new Error(fx.effects?.status?.error ?? "Transaction reverted on-chain");
      }
      onDone(res.digest);
    } catch (e: any) {
      setErr(e?.message ?? "transaction failed");
    } finally {
      setConfirming(false);
    }
  }

  const busy = isPending || confirming;

  return (
    <div>
      <button
        className={`btn btn-primary${block ? " btn-block" : ""}`}
        disabled={disabled || !txB64 || busy}
        onClick={run}
      >
        {busy ? pendingLabel : label}
      </button>
      {err && <p className="muted-note" style={{ color: "var(--danger)" }}>{err}</p>}
    </div>
  );
}
