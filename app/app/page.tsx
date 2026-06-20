// File: app/app/page.tsx · Workspace (client). Live position, deleverage gauge, refinance, DeepBook.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { PositionCard } from "../components/PositionCard";
import { PreviewPanel } from "../components/PreviewPanel";
import { BeforeAfterPanel } from "../components/BeforeAfterPanel";
import { DeleveragePanel } from "../components/DeleveragePanel";
import { DestinationPicker, type DestId } from "../components/DestinationPicker";
import { DeepBookPanel } from "../components/DeepBookPanel";
import { ActionButton } from "../components/ActionButton";
import { Progress } from "../components/Progress";
import { TxLink } from "../components/TxLink";
import { Reveal } from "../components/Reveal";
import { BrandMark } from "../components/BrandMark";
import type { PositionView, PreviewResult } from "@/lib/types";

const DEMO = process.env.NEXT_PUBLIC_DEMO_ADDRESS || "";
type Mode = "deleverage" | "refinance";

export default function Workspace() {
  const account = useCurrentAccount();
  const connected = !!account?.address;
  const address = account?.address || DEMO;
  const isDemoView = !connected && !!DEMO;

  const [mode, setMode] = useState<Mode>("deleverage");
  const [pos, setPos] = useState<PositionView | null>(null);
  const [posLoading, setPosLoading] = useState(true);
  const [posError, setPosError] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dest, setDest] = useState<DestId>("suilend");

  useEffect(() => {
    if (!address) { setPosLoading(false); return; }
    setPosLoading(true); setPosError(false);
    fetch(`/api/position?address=${address}`)
      .then((r) => r.json())
      .then((p: PositionView) => {
        setPos(p);
        if (p?.recommendedDest) setDest(p.recommendedDest); // default to the cheapest venue
      })
      .catch(() => setPosError(true))
      .finally(() => setPosLoading(false));
  }, [address]);

  function switchMode(m: Mode) {
    setMode(m);
    setPreview(null);
    setDigest(null);
  }

  async function doPreview(destId: DestId = dest) {
    if (!pos?.hasPosition || !pos.collateral || !pos.debt) return;
    setLoading(true); setPreview(null); setDigest(null);
    try {
      const body = {
        address,
        debtAtomic: String(Math.round(pos.debt.amountHuman * 1e6)),
        collateralAtomic: String(Math.round(pos.collateral.amountHuman * 1e9)),
        destId,
      };
      const r = await fetch("/api/preview", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      setPreview(await r.json());
    } catch {
      setPreview({ ok: false, abortReason: "Could not reach the simulator. Try again.", balanceChanges: [] });
    } finally {
      setLoading(false);
    }
  }

  function chooseDest(d: DestId) {
    setDest(d);
    if (preview) doPreview(d); // re-run only if the user has already previewed
  }

  return (
    <div className="wrap app">
      <Reveal />
      <div className="shell">
        <header className="app-header">
          <div className="app-brand">
            <Link className="wm" href="/"><BrandMark size={24} />RefiRail</Link>
            <span className="net"><span className="live" />Sui mainnet</span>
          </div>
          <div className="connect"><ConnectButton /></div>
        </header>

        <div className="app-title reveal">
          <h2>Your position, ready to settle.</h2>
          <p>
            {isDemoView
              ? "Read-only preview, no wallet wall. Drag the control and the engine dry-runs the whole atomic transaction before you ever sign."
              : "Drag the control and the engine dry-runs the whole atomic transaction before you ever sign."}
          </p>
        </div>

        {posLoading && <div className="notice">Reading the position on-chain.</div>}
        {!posLoading && posError && (
          <div className="notice">The position did not load. Check your connection and refresh.</div>
        )}
        {!posLoading && !posError && pos && !pos.hasPosition && (
          <div className="notice">
            No Navi SUI/USDC loan found{connected ? " on your wallet" : ""}.
            {connected && DEMO ? " Disconnect to view the live demo position." : ""}
          </div>
        )}

        {!posLoading && !posError && pos?.hasPosition && (
          <>
            <div className="modes reveal" role="group" aria-label="Operation">
              <button className="mode-btn" aria-pressed={mode === "deleverage"} onClick={() => switchMode("deleverage")}>
                Reduce my risk
              </button>
              <button className="mode-btn" aria-pressed={mode === "refinance"} onClick={() => switchMode("refinance")}>
                Move to a cheaper rate
              </button>
            </div>

            <div className="grid reveal" data-d="1">
              <PositionCard p={pos} />

              {mode === "deleverage" ? (
                <DeleveragePanel
                  address={address}
                  hasPosition={!!pos?.hasPosition}
                  canAct={connected}
                  currentHealth={pos.healthFactor}
                  debtHuman={pos.debt?.amountHuman}
                  collHuman={pos.collateral?.amountHuman}
                />
              ) : (
                <div className="card hero-panel">
                  {(() => {
                    const destLabel = dest === "alphalend" ? "AlphaLend" : "Suilend";
                    const destApr = dest === "alphalend" ? pos.alphalendAprPct : pos.suilendAprPct;
                    // Honest delta against the venue actually chosen (not always the cheapest).
                    const destDelta =
                      pos.naviAprPct != null && destApr != null ? pos.naviAprPct - destApr : undefined;
                    return (
                      <>
                        <div className="hp-left">
                          <p className="hp-eyebrow">The trust-builder · Move to a cheaper rate</p>
                          <h3 className="hp-h">Refinance to {destLabel}.</h3>
                          <p className="hp-sub">
                            Move the Navi loan onto a lower borrow APR in one atomic PTB, without the
                            capital to unwind it yourself.
                          </p>
                        </div>

                        <DestinationPicker
                          selected={dest}
                          recommended={pos.recommendedDest ?? "suilend"}
                          onSelect={chooseDest}
                          naviAprPct={pos.naviAprPct}
                          suilendAprPct={pos.suilendAprPct}
                          alphalendAprPct={pos.alphalendAprPct}
                          disabled={loading}
                        />

                        <div className="exec-row">
                          <button className="btn btn-ghost" disabled={loading} onClick={() => doPreview()}>
                            {loading ? "Simulating…" : "Preview refinance"}
                          </button>
                          <ActionButton
                            txB64={preview?.txB64}
                            disabled={!preview?.ok || !connected}
                            label={connected ? `Refinance to ${destLabel}` : "Connect a wallet to refinance"}
                            pendingLabel="Refinancing…"
                            onDone={setDigest}
                          />
                        </div>
                        {loading && <Progress />}
                        <PreviewPanel preview={preview} />
                        {preview?.ok && (
                          <BeforeAfterPanel
                            beforeApr={pos.naviAprPct} afterApr={destApr}
                            beforeHealth={pos.healthFactor} afterHealth={preview.healthAfter}
                            aprDeltaPct={destDelta} debtUsd={pos.debt?.usd}
                            destLabel={destLabel}
                          />
                        )}
                        {digest && (
                          <div className="card success">
                            <p>Refinanced. Your loan now lives on {destLabel} at the lower rate.</p>
                            <TxLink digest={digest} />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="deepbook reveal" data-d="2">
              <p className="card-label" style={{ marginTop: 32 }}>DeepBook best execution</p>
              <DeepBookPanel />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
