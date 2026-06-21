// File: app/app/page.tsx · Workspace (client). Live position, deleverage gauge, refinance, DeepBook.
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { PositionCard } from "../components/PositionCard";
import { PreviewPanel } from "../components/PreviewPanel";
import { BeforeAfterPanel } from "../components/BeforeAfterPanel";
import { DeleveragePanel } from "../components/DeleveragePanel";
import { DestinationPicker, type DestId } from "../components/DestinationPicker";
import { PositionPicker } from "../components/PositionPicker";
import { DeepBookPanel } from "../components/DeepBookPanel";
import { ActionButton } from "../components/ActionButton";
import { Progress } from "../components/Progress";
import { TxLink } from "../components/TxLink";
import { Reveal } from "../components/Reveal";
import { BrandMark } from "../components/BrandMark";
import type { PositionView, PreviewResult, Position } from "@/lib/types";

const DEMO = process.env.NEXT_PUBLIC_DEMO_ADDRESS || "";
type Mode = "deleverage" | "refinance";
const LENDER_LABEL: Record<Position["protocol"], string> = { navi: "Navi", suilend: "Suilend", alphalend: "AlphaLend" };

// Refinance amount control: move the whole loan or a slice. Engine accepts any fraction in (0, 1].
const REFI_DETENTS = [0.25, 0.5, 0.75, 1.0];
function snapRefi(f: number): number {
  for (const d of REFI_DETENTS) if (Math.abs(f - d) <= 0.03) return d;
  return f;
}

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
  const [refiFraction, setRefiFraction] = useState(1.0);
  const refiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedPosId, setSelectedPosId] = useState<string>("");

  useEffect(() => {
    if (!address) { setPosLoading(false); return; }
    setPosLoading(true); setPosError(false);
    fetch(`/api/position?address=${address}`)
      .then((r) => r.json())
      .then((p: PositionView) => {
        setPos(p);
        if (p?.recommendedDest) setDest(p.recommendedDest); // default to the cheapest venue
        if (p?.selectedPositionId) setSelectedPosId(p.selectedPositionId); // default to the actionable Navi position
      })
      .catch(() => setPosError(true))
      .finally(() => setPosLoading(false));
  }, [address]);

  function switchMode(m: Mode) {
    setMode(m);
    setPreview(null);
    setDigest(null);
    if (refiTimer.current) clearTimeout(refiTimer.current);
  }

  async function doPreview(destId: DestId = dest, fraction: number = refiFraction) {
    if (!pos?.hasPosition || !pos.collateral || !pos.debt) return;
    setLoading(true); setPreview(null); setDigest(null);
    try {
      // F3: server reads the live position; we only send the choice (venue + how much).
      const body = { address, destId, fraction };
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
    if (preview) doPreview(d, refiFraction); // re-run only if the user has already previewed
  }

  // Dragging the amount updates the label instantly; re-previews (debounced) only if already previewed.
  function onRefiSlide(raw: number) {
    const f = snapRefi(raw);
    setRefiFraction(f);
    if (refiTimer.current) clearTimeout(refiTimer.current);
    if (preview) refiTimer.current = setTimeout(() => doPreview(dest, f), 350);
  }

  // Cross-lender selection. Only the Navi position is actionable (the engine source); others are view-only.
  const positions = pos?.positions ?? [];
  const selectedPos = positions.find((p) => p.id === selectedPosId) ?? positions[0];
  const actionable = selectedPos ? selectedPos.actionable : true; // back-compat: no positions[] -> Navi

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
            <PositionPicker positions={positions} selectedId={selectedPos?.id ?? ""} onSelect={setSelectedPosId} />
            {pos.positionsNote && <p className="muted-note" style={{ marginTop: 8 }}>{pos.positionsNote}</p>}
            {actionable ? (
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
                          isNaviCheapest={pos.isNaviCheapest}
                          disabled={loading}
                        />

                        <div className="control">
                          <div className="control-head">
                            <span className="ch-label">Move how much</span>
                            <span className="ch-val big-val">{Math.round(refiFraction * 100)}%</span>
                          </div>
                          <div className="slider-wrap">
                            <input
                              className="slider"
                              type="range"
                              min={0.05}
                              max={1.0}
                              step={0.01}
                              value={refiFraction}
                              disabled={loading}
                              aria-label="Refinance amount as a percentage of the loan"
                              aria-valuetext={`${Math.round(refiFraction * 100)} percent`}
                              onChange={(e) => onRefiSlide(parseFloat(e.target.value))}
                              style={{ ["--pct" as string]: `${((refiFraction - 0.05) / 0.95) * 100}%` }}
                            />
                            <div className="slider-ticks" aria-hidden="true">
                              {REFI_DETENTS.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  className={`tick${refiFraction === d ? " on" : ""}`}
                                  disabled={loading}
                                  tabIndex={-1}
                                  onClick={() => onRefiSlide(d)}
                                >
                                  {d * 100}%
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="seg-hint">Move the whole loan, or a slice. Snaps to 25, 50, 75, 100 percent.</div>
                        </div>

                        <div className="exec-row">
                          <button className="btn btn-ghost" disabled={loading} onClick={() => doPreview()}>
                            {loading ? "Simulating…" : "Preview refinance"}
                          </button>
                          <ActionButton
                            txB64={preview?.txB64}
                            disabled={!preview?.ok || !connected}
                            label={connected ? `Refinance ${refiFraction < 1 ? Math.round(refiFraction * 100) + "% " : ""}to ${destLabel}` : "Connect a wallet to refinance"}
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
                            aprDeltaPct={destDelta}
                            debtUsd={pos.debt?.usd != null ? +(pos.debt.usd * refiFraction).toFixed(2) : undefined}
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
            ) : (
              <div className="grid reveal" data-d="1">
                <aside className="card" aria-label="Position detail">
                  <p className="card-label">Position detail</p>
                  <div className="pos-lender">
                    <span className="lname">{selectedPos ? LENDER_LABEL[selectedPos.protocol] : ""}</span>
                    <span className="badge">Lender</span>
                  </div>
                  <div className="pos-row"><span className="k">Collateral</span><span className="v">{selectedPos?.collateral?.amountHuman?.toFixed(2)} SUI</span></div>
                  <div className="pos-row"><span className="k">Borrowed</span><span className="v">{selectedPos?.debt?.amountHuman?.toFixed(2)} USDC</span></div>
                  <div className="pos-row"><span className="k">Borrow APR</span><span className="v hi">{selectedPos?.borrowAprPct?.toFixed(1)}%</span></div>
                  <div className="pos-row"><span className="k">Health factor</span><span className="v">{selectedPos?.healthFactor != null ? selectedPos.healthFactor.toFixed(2) : "n/a"}</span></div>
                </aside>
                <div className="card hero-panel">
                  <div className="hp-left">
                    <p className="hp-eyebrow">View only</p>
                    <h3 className="hp-h">This loan lives on {selectedPos ? LENDER_LABEL[selectedPos.protocol] : ""}.</h3>
                    <p className="hp-sub">
                      RefiRail moves and de-risks your Navi loan today. This is the position you
                      refinanced onto {selectedPos ? LENDER_LABEL[selectedPos.protocol] : ""}. Select your
                      Navi position above to move or de-risk it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
