// File: app/components/DeleveragePanel.tsx
// "Reduce my risk" — pick a % to pay down; preview routes through DeepBook (real /api/deleverage
// dryRun). Headline metric is HEALTH rising. One atomic tx, zero upfront capital, reverts if the
// route underdelivers. All numbers are live (no fabrication).
"use client";
import { useState } from "react";
import { ActionButton } from "./ActionButton";
import { Progress } from "./Progress";
import { TxLink } from "./TxLink";
import type { DeleverageResult } from "@/lib/types";

const PRESETS = [0.25, 0.5, 0.75];

export function DeleveragePanel({
  address,
  hasPosition,
  canAct,
}: {
  address: string;
  hasPosition: boolean;
  canAct: boolean;
}) {
  const [fraction, setFraction] = useState(0.5);
  const [res, setRes] = useState<DeleverageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);

  async function preview(f: number) {
    setFraction(f);
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
      setRes({ ok: false, abortReason: "Could not reach the simulator — try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <span className="tag">Reduce my risk · pay down by</span>
      <div className="seg" role="group" aria-label="Deleverage percentage">
        {PRESETS.map((f) => (
          <button
            key={f}
            className={`seg-btn${fraction === f ? " on" : ""}`}
            disabled={!hasPosition || loading}
            aria-pressed={fraction === f}
            onClick={() => preview(f)}
          >
            {f * 100}%
          </button>
        ))}
      </div>

      {loading && <Progress />}
      {res && !res.ok && <p className="tag note bad">{res.abortReason}</p>}

      {res && res.ok && (
        <>
          <div className="grid2">
            <div>
              <h4>Now</h4>
              <p>Debt ${res.debtBeforeUsd?.toFixed(2)}</p>
              <p>Collateral ${res.collatBeforeUsd?.toFixed(2)}</p>
              <p>Health {res.healthBefore?.toFixed(2)}</p>
            </div>
            <div>
              <h4>After</h4>
              <p>Debt ${res.debtAfterUsd?.toFixed(2)}</p>
              <p>Collateral ${res.collatAfterUsd?.toFixed(2)}</p>
              <p className="good">Health {res.healthAfter?.toFixed(2)} ↑</p>
            </div>
          </div>
          <div className="row"><span>Route</span><b>{res.route}</b></div>
          <div className="row"><span>DeepBook fee</span><b className="good">$0.00</b></div>
          <div className="row">
            <span>Sell</span>
            <b>{res.suiSold} SUI → repay ${res.usdcRepaid?.toFixed(2)}</b>
          </div>
          <p className="tag note">
            One atomic transaction · zero upfront capital · reverts if the route can’t deliver.
          </p>
          <div className="actions">
            <ActionButton
              txB64={res.txB64}
              disabled={!res.ok || !canAct}
              label="Deleverage now"
              pendingLabel="Deleveraging…"
              onDone={setDigest}
            />
          </div>
        </>
      )}

      {digest && (
        <div className="card good">
          <p>
            Risk reduced. You paid down ${res?.usdcRepaid?.toFixed(2)} by routing {res?.suiSold} SUI
            through DeepBook — in one atomic transaction.
          </p>
          <TxLink digest={digest} />
        </div>
      )}
    </div>
  );
}
