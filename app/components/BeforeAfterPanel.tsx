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
      <div><h4>Before</h4><p>APR {beforeApr?.toFixed(1)}%</p><p>Health {beforeHealth ?? "—"}</p></div>
      <div><h4>After</h4><p className="good">APR {afterApr?.toFixed(1)}%</p><p>Health {afterHealth ?? "—"}</p></div>
      {annualSavingsUsd != null && aprDeltaPct != null && (
        <div className="badge good" style={{ gridColumn: "1 / -1" }}>
          Save {aprDeltaPct.toFixed(1)}% APR ≈ ${annualSavingsUsd.toFixed(2)}/year on this position.
        </div>
      )}
    </div>
  );
}
