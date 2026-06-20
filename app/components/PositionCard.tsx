// File: app/components/PositionCard.tsx
import type { PositionView } from "@/lib/types";

export function PositionCard({ p }: { p: PositionView }) {
  if (!p.hasPosition) return <div className="notice">{p.note ?? "No position found."}</div>;
  return (
    <aside className="card" aria-label="Live lending position">
      <p className="card-label">Live position</p>
      <div className="pos-lender">
        <span className="lname">Navi</span>
        <span className="badge">Lender</span>
      </div>
      <div className="pos-row"><span className="k">Collateral</span><span className="v">{p.collateral?.amountHuman} SUI</span></div>
      <div className="pos-row"><span className="k">Borrowed</span><span className="v">{p.debt?.amountHuman} USDC</span></div>
      <div className="pos-row"><span className="k">Current APR</span><span className="v hi">{p.naviAprPct?.toFixed(1)}%</span></div>
      <div className="pos-row"><span className="k">Suilend APR</span><span className="v">{p.suilendAprPct?.toFixed(1)}%</span></div>
      <div className="pos-row"><span className="k">Health factor</span><span className="v">{p.healthFactor != null ? p.healthFactor.toFixed(2) : "n/a"}</span></div>

      {p.aprDeltaPct != null && (
        <div className="rate-compare">
          <span className="rc-text"><b>Save</b> by moving to Suilend</span>
          <span className="rc-save">{p.aprDeltaPct.toFixed(1)}% APR</span>
        </div>
      )}
    </aside>
  );
}
