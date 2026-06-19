// File: app/page.tsx
"use client";
import { useEffect, useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { PositionCard } from "./components/PositionCard";
import { PreviewPanel } from "./components/PreviewPanel";
import { BeforeAfterPanel } from "./components/BeforeAfterPanel";
import { DeleveragePanel } from "./components/DeleveragePanel";
import { DeepBookPanel } from "./components/DeepBookPanel";
import { ActionButton } from "./components/ActionButton";
import { Progress } from "./components/Progress";
import { TxLink } from "./components/TxLink";
import type { PositionView, PreviewResult } from "@/lib/types";

const DEMO = process.env.NEXT_PUBLIC_DEMO_ADDRESS || "";
type Mode = "refinance" | "deleverage";

export default function Home() {
  const account = useCurrentAccount();
  const connected = !!account?.address;
  const address = account?.address || DEMO;
  const isDemoView = !connected && !!DEMO;

  const [mode, setMode] = useState<Mode>("deleverage"); // deleverage leads (the DeepBook story)
  const [pos, setPos] = useState<PositionView | null>(null);
  const [posLoading, setPosLoading] = useState(true);
  const [posError, setPosError] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) { setPosLoading(false); return; }
    setPosLoading(true); setPosError(false);
    fetch(`/api/position?address=${address}`)
      .then((r) => r.json())
      .then(setPos)
      .catch(() => setPosError(true))
      .finally(() => setPosLoading(false));
  }, [address]);

  function switchMode(m: Mode) {
    setMode(m);
    setPreview(null);
    setDigest(null);
  }

  async function doPreview() {
    if (!pos?.hasPosition || !pos.collateral || !pos.debt) return;
    setLoading(true); setPreview(null); setDigest(null);
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
    <main className="shell">
      <div className="col">
        <header className="hero">
          <h1>RefiRail</h1>
          <div className="hero-rail" aria-hidden="true" />
          <p>
            Manage your loan in one click — move it to a cheaper rate or de-risk it. One atomic
            transaction, zero upfront capital, reverts if it would ever leave you unhealthy.
          </p>
          <div className="connect"><ConnectButton /></div>
        </header>

        {isDemoView && (
          <div className="card muted">Viewing the live demo position (read-only). Connect a wallet to act on your own loan.</div>
        )}
        {posLoading && <div className="card muted">Reading the position on-chain…</div>}
        {!posLoading && posError && (
          <div className="card muted">Couldn’t load the position. Check your connection and refresh.</div>
        )}
        {!posLoading && !posError && pos && !pos.hasPosition && (
          <div className="card muted">
            No Navi SUI/USDC loan found{connected ? " on your wallet" : ""}.
            {connected && DEMO ? " Disconnect to view the live demo position in action." : ""}
          </div>
        )}
        {!posLoading && !posError && pos?.hasPosition && <PositionCard p={pos} />}

        {pos?.hasPosition && (
          <>
            <div className="seg modes" role="group" aria-label="Operation">
              <button className={`seg-btn${mode === "refinance" ? " on" : ""}`} aria-pressed={mode === "refinance"} onClick={() => switchMode("refinance")}>
                Move to cheaper rate
              </button>
              <button className={`seg-btn${mode === "deleverage" ? " on" : ""}`} aria-pressed={mode === "deleverage"} onClick={() => switchMode("deleverage")}>
                Reduce my risk
              </button>
            </div>

            {mode === "refinance" ? (
              <>
                <div className="actions">
                  <button className="ghost" disabled={loading} onClick={doPreview}>
                    {loading ? "Simulating…" : "Preview refinance"}
                  </button>
                  <ActionButton txB64={preview?.txB64} disabled={!preview?.ok || !connected} label="Refinance to Suilend" pendingLabel="Refinancing…" onDone={setDigest} />
                </div>
                {loading && <Progress />}
                <PreviewPanel preview={preview} />
                {preview?.ok && (
                  <BeforeAfterPanel
                    beforeApr={pos.naviAprPct} afterApr={pos.suilendAprPct}
                    beforeHealth={pos.healthFactor} afterHealth={preview.healthAfter}
                    aprDeltaPct={pos.aprDeltaPct} debtUsd={pos.debt?.usd}
                  />
                )}
                {digest && (
                  <div className="card good">
                    <p>Refinanced. Your loan now lives on Suilend at the lower rate.</p>
                    <TxLink digest={digest} />
                  </div>
                )}
              </>
            ) : (
              <DeleveragePanel address={address} hasPosition={!!pos?.hasPosition} canAct={connected} />
            )}
          </>
        )}
      </div>

      <aside className="side">
        <DeepBookPanel />
      </aside>
    </main>
  );
}
