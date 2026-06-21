// File: app/components/DeleveragePanel.tsx
// "Reduce my risk": pick a % to pay down; preview routes through DeepBook (real /api/deleverage
// dryRun). The headline metric is the health factor rising. One atomic tx, reverts if the route
// underdelivers. Every number is live (no fabrication).
"use client";
import { useEffect, useRef, useState } from "react";
import { ActionButton } from "./ActionButton";
import { HealthGauge } from "./HealthGauge";
import { Progress } from "./Progress";
import { TxLink } from "./TxLink";
import type { DeleverageResult } from "@/lib/types";

const MIN = 0.05;          // engine accepts any fraction in (0, 0.9]
const MAX = 0.9;
const STEP = 0.01;
const DETENTS = [0.25, 0.5, 0.75]; // soft snap targets
const SNAP = 0.03;          // pull to a detent if within 3%
const DEBOUNCE_MS = 350;

function snap(f: number): number {
  for (const d of DETENTS) if (Math.abs(f - d) <= SNAP) return d;
  return f;
}

export function DeleveragePanel({
  address,
  hasPosition,
  canAct,
  currentHealth,
  debtHuman,
  collHuman,
  onSettled,
}: {
  address: string;
  hasPosition: boolean;
  canAct: boolean;
  currentHealth?: number;
  debtHuman?: number;
  collHuman?: number;
  onSettled?: (digest: string) => void;
}) {
  const [fraction, setFraction] = useState(0.5);
  const [res, setRes] = useState<DeleverageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function preview(f: number) {
    setLoading(true);
    setRes(null);
    setDigest(null);
    try {
      const r = await fetch("/api/deleverage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, fraction: f }),
      });
      setRes(await r.json());
    } catch {
      setRes({ ok: false, abortReason: "Could not reach the simulator. Try again." });
    } finally {
      setLoading(false);
    }
  }

  // Dragging updates the % label instantly but debounces the dry-run so we don't spam the API.
  function onSlide(raw: number) {
    const f = snap(raw);
    setFraction(f);
    if (!hasPosition) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => preview(f), DEBOUNCE_MS);
  }

  useEffect(() => {
    if (hasPosition) preview(0.5);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPosition, address]);

  const gaugeValue = res?.ok ? res.healthAfter : currentHealth;
  const newDebt =
    res?.ok && debtHuman != null && res.usdcRepaid != null ? debtHuman - res.usdcRepaid : null;
  const newColl =
    res?.ok && collHuman != null && res.suiSold != null ? collHuman - res.suiSold : null;
  const active = res?.ok;

  return (
    <div className="card hero-panel">
      <div className="hp-top">
        <div className="hp-left">
          <p className="hp-eyebrow">The hero · Reduce my risk</p>
          <h3 className="hp-h">Lift your health factor.</h3>
          <p className="hp-sub">
            Pay down USDC debt with SUI collateral, routed fee-free through DeepBook. The bigger the
            paydown, the higher the health.
          </p>
        </div>
        <HealthGauge value={gaugeValue} />
      </div>

      <div className="control">
        <div className="control-head">
          <span className="ch-label">Pay down debt by</span>
          <span className="ch-val big-val">{Math.round(fraction * 100)}%</span>
        </div>
        <div className="slider-wrap">
          <input
            className="slider"
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={fraction}
            disabled={!hasPosition}
            aria-label="Pay down debt by percentage"
            aria-valuetext={`${Math.round(fraction * 100)} percent`}
            onChange={(e) => onSlide(parseFloat(e.target.value))}
            style={{ ["--pct" as string]: `${((fraction - MIN) / (MAX - MIN)) * 100}%` }}
          />
          <div className="slider-ticks" aria-hidden="true">
            {DETENTS.map((d) => (
              <button
                key={d}
                type="button"
                className={`tick${fraction === d ? " on" : ""}`}
                disabled={!hasPosition}
                tabIndex={-1}
                onClick={() => onSlide(d)}
              >
                {d * 100}%
              </button>
            ))}
          </div>
        </div>
        <div className="seg-hint">Snaps to 25, 50, 75 percent, or drag anywhere between.</div>

        {loading && <Progress />}
        {res && !res.ok && (
          <p className="muted-note" style={{ color: "var(--warn)" }}>{res.abortReason}</p>
        )}

        <div className="deltas">
          <div className={`delta-box${active ? " down" : ""}`}>
            <span className="db-k">Debt</span>
            <div className="db-flow">
              <span className="db-from">{debtHuman != null ? debtHuman.toFixed(3) : "n/a"}</span>
              <span className="db-arr">&#8594;</span>
              <span className="db-to">
                {newDebt != null ? newDebt.toFixed(2) : (debtHuman != null ? debtHuman.toFixed(3) : "n/a")} USDC
              </span>
            </div>
          </div>
          <div className={`delta-box${active ? " down" : ""}`}>
            <span className="db-k">Collateral</span>
            <div className="db-flow">
              <span className="db-from">{collHuman != null ? collHuman.toFixed(2) : "n/a"}</span>
              <span className="db-arr">&#8594;</span>
              <span className="db-to">
                {newColl != null ? newColl.toFixed(2) : (collHuman != null ? collHuman.toFixed(2) : "n/a")} SUI
              </span>
            </div>
          </div>
        </div>

        {active && (
          <p className="proj-note">
            Health and balances are projected from a live dry-run. The transaction reverts on-chain if the real outcome would differ.
          </p>
        )}

        <div className="exec-row">
          <ActionButton
            txB64={res?.txB64}
            disabled={!res?.ok || !canAct}
            label={canAct ? "Sign & settle" : "Connect a wallet to settle"}
            pendingLabel="Settling…"
            onDone={(d) => { setDigest(d); onSettled?.(d); }}
          />
          <span className="exec-note">
            <span className="lock">&#9679;</span> Dry-run proven. Reverts if it would ever leave you worse off.
          </span>
        </div>

        {digest && (
          <div className="card success">
            <p>
              Risk reduced. You repaid <b>${res?.usdcRepaid?.toFixed(2)}</b> by routing{" "}
              <b>{res?.suiSold} SUI</b> through DeepBook, in one atomic transaction.
            </p>
            <TxLink digest={digest} />
          </div>
        )}
      </div>
    </div>
  );
}
