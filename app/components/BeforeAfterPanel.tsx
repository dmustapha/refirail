// File: app/components/BeforeAfterPanel.tsx
export function BeforeAfterPanel({
  beforeApr, afterApr, beforeHealth, afterHealth, aprDeltaPct, debtUsd,
}: {
  beforeApr?: number; afterApr?: number; beforeHealth?: number; afterHealth?: number;
  aprDeltaPct?: number; debtUsd?: number;
}) {
  // [CRITIQUE E-3] Annualized savings on this position, computed client-side from /api/position.
  const annualSavingsUsd =
    aprDeltaPct != null && debtUsd != null ? (aprDeltaPct / 100) * debtUsd : undefined;
  return (
    <div className="card grid2">
      <div>
        <h4>Before · Navi</h4>
        <p>APR {beforeApr?.toFixed(1)}%</p>
        <p>Health {beforeHealth != null ? beforeHealth.toFixed(2) : "—"}</p>
      </div>
      <div>
        <h4>After · Suilend</h4>
        <p className="good">APR {afterApr?.toFixed(1)}%</p>
        <p>Health {afterHealth != null ? afterHealth.toFixed(2) : "—"}</p>
      </div>

      {/* the Rail — the loan travels from Navi to the cheaper Suilend rate */}
      <div className="rail" aria-hidden="true">
        <span className="rail-end"><span className="rail-node" />Navi</span>
        <span className="rail-track"><span className="rail-dot" /></span>
        <span className="rail-end">Suilend<span className="rail-node active" /></span>
      </div>

      {annualSavingsUsd != null && aprDeltaPct != null && (
        <div className="badge good flash" style={{ gridColumn: "1 / -1" }}>
          ↓ Save {aprDeltaPct.toFixed(1)}% APR ≈ ${annualSavingsUsd.toFixed(2)}/year on this position.
        </div>
      )}
    </div>
  );
}
