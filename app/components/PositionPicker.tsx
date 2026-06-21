// File: app/components/PositionPicker.tsx
// Cross-lender position picker. Shows every position the wallet holds across Navi, AlphaLend, and
// Suilend, and lets the user select one. Only the Navi position is actionable today (the engine
// source); the rest are view-only. Read-only — no fabrication, all numbers come from /api/position.
"use client";
import type { Position } from "@/lib/types";

const LENDER_LABEL: Record<Position["protocol"], string> = {
  navi: "Navi",
  suilend: "Suilend",
  alphalend: "AlphaLend",
};

export function PositionPicker({
  positions,
  selectedId,
  onSelect,
}: {
  positions: Position[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (positions.length <= 1) return null;
  return (
    <div className="positions-strip reveal" role="group" aria-label="Your positions across lenders">
      <p className="card-label">Your positions across lenders</p>
      <div className="pos-chips">
        {positions.map((p) => {
          const on = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              className={`pos-chip${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => onSelect(p.id)}
            >
              <span className="pc-top">
                <span className="pc-lender">{LENDER_LABEL[p.protocol] ?? p.protocol}</span>
                <span className={`pc-tag${p.actionable ? " act" : ""}`}>
                  {p.actionable ? "Actionable" : "View only"}
                </span>
              </span>
              <span className="pc-amts">
                <span className="mono">{p.collateral?.amountHuman?.toFixed(2) ?? "0"}</span> SUI
                <span className="pc-sep">/</span>
                <span className="mono">{p.debt?.amountHuman?.toFixed(2) ?? "0"}</span> USDC
              </span>
              <span className="pc-meta">
                Health <span className="mono">{p.healthFactor != null ? p.healthFactor.toFixed(2) : "n/a"}</span>
                <span className="pc-sep">&#183;</span>
                APR <span className="mono">{p.borrowAprPct != null ? p.borrowAprPct.toFixed(1) : "n/a"}%</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
