// File: app/components/PositionCard.tsx
import type { PositionView } from "@/lib/types";
export function PositionCard({ p }: { p: PositionView }) {
  if (!p.hasPosition) return <div className="card muted">{p.note ?? "No position."}</div>;
  return (
    <div className="card">
      <div className="row"><span>Lender</span><b>Navi</b></div>
      <div className="row"><span>Collateral</span><b>{p.collateral?.amountHuman} SUI</b></div>
      <div className="row"><span>Borrowed</span><b>{p.debt?.amountHuman} USDC</b></div>
      <div className="row"><span>Current APR</span><b className="bad">{p.naviAprPct?.toFixed(1)}%</b></div>
      <div className="row"><span>Suilend APR</span><b className="good">{p.suilendAprPct?.toFixed(1)}%</b></div>
      {p.aprDeltaPct != null && <div className="badge good">Save {p.aprDeltaPct.toFixed(1)}% APR</div>}
      <div className="row"><span>Health</span><b>{p.healthFactor ?? "—"}</b></div>
    </div>
  );
}
