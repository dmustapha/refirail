// File: app/page.tsx
"use client";
import { useEffect, useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { PositionCard } from "./components/PositionCard";
import { PreviewPanel } from "./components/PreviewPanel";
import { BeforeAfterPanel } from "./components/BeforeAfterPanel";
import { RefinanceButton } from "./components/RefinanceButton";
import { TxLink } from "./components/TxLink";
import type { PositionView, PreviewResult } from "@/lib/types";

const DEMO = process.env.NEXT_PUBLIC_DEMO_ADDRESS || "";

export default function Home() {
  const account = useCurrentAccount();
  const address = account?.address || DEMO;
  const [pos, setPos] = useState<PositionView | null>(null);
  const [posLoading, setPosLoading] = useState(true);
  const [posError, setPosError] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setPosLoading(true);
    setPosError(false);
    fetch(`/api/position?address=${address}`)
      .then((r) => r.json())
      .then(setPos)
      .catch(() => setPosError(true))
      .finally(() => setPosLoading(false));
  }, [address]);

  async function doPreview() {
    if (!pos?.hasPosition || !pos.collateral || !pos.debt) return;
    setLoading(true);
    setPreview(null);
    try {
      const body = {
        address,
        debtAtomic: String(Math.round(pos.debt.amountHuman * 1e6)),
        collateralAtomic: String(Math.round(pos.collateral.amountHuman * 1e9)),
      };
      const r = await fetch("/api/preview", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      setPreview(await r.json());
    } catch {
      setPreview({ ok: false, abortReason: "Could not reach the simulator — try again.", balanceChanges: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <header className="hero">
        <h1>RefiRail</h1>
        <div className="hero-rail" aria-hidden="true" />
        <p>Move your loan to a cheaper rate in one click — one atomic transaction, reverts if it would ever hurt you.</p>
        <div className="connect"><ConnectButton /></div>
      </header>

      {posLoading && <div className="card muted">Reading your position on-chain…</div>}
      {!posLoading && posError && (
        <div className="card muted">Couldn’t load your position. Check your connection and refresh.</div>
      )}
      {!posLoading && !posError && pos && <PositionCard p={pos} />}

      <div className="actions">
        <button className="ghost" disabled={!pos?.hasPosition || loading} onClick={doPreview}>
          {loading ? "Simulating…" : "Preview Refinance"}
        </button>
        <RefinanceButton txB64={preview?.txB64} disabled={!preview?.ok} onDone={setDigest} />
      </div>

      <PreviewPanel preview={preview} />
      {preview?.ok && (
        <BeforeAfterPanel
          beforeApr={pos?.naviAprPct} afterApr={pos?.suilendAprPct}
          beforeHealth={pos?.healthFactor} afterHealth={preview.healthAfter}
          aprDeltaPct={pos?.aprDeltaPct} debtUsd={pos?.debt?.usd}
        />
      )}
      {digest && (
        <div className="card good">
          <p>Refinanced. Your loan now lives on Suilend at the lower rate.</p>
          <TxLink digest={digest} />
        </div>
      )}
    </main>
  );
}
