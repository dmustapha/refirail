// File: app/components/BeforeAfterPanel.tsx
// Refinance before/after: the loan travels along the rail from Navi to the chosen, cheaper rate.
// The destination half (label + APR) reflects the venue the user routed to.
export function BeforeAfterPanel({
  beforeApr,
  afterApr,
  beforeHealth,
  afterHealth,
  aprDeltaPct,
  debtUsd,
  destLabel = "Suilend",
}: {
  beforeApr?: number;
  afterApr?: number;
  beforeHealth?: number;
  afterHealth?: number;
  aprDeltaPct?: number;
  debtUsd?: number;
  destLabel?: string;
}) {
  // Annualized savings on this position, computed client-side from /api/position. F1: only when the
  // move actually saves (positive delta) — never render a negative "saving" for a pricier destination.
  const annualSavingsUsd =
    aprDeltaPct != null && aprDeltaPct > 0 && debtUsd != null ? (aprDeltaPct / 100) * debtUsd : undefined;
  return (
    <div className="card ba-grid">
      <div className="ba-col">
        <h4>Before · Navi</h4>
        <div className="line"><span>APR</span><b>{beforeApr?.toFixed(1)}%</b></div>
        <div className="line"><span>Health</span><b>{beforeHealth != null ? beforeHealth.toFixed(2) : "n/a"}</b></div>
      </div>
      <div className="ba-col">
        <h4>After · {destLabel}</h4>
        <div className="line"><span>APR</span><b className="good">{afterApr?.toFixed(1)}%</b></div>
        <div className="line"><span>Health<span className="proj">projected</span></span><b>{afterHealth != null ? afterHealth.toFixed(2) : "n/a"}</b></div>
      </div>

      <div className="refi-rail" aria-hidden="true">
        <span className="end">Navi</span>
        <span className="track"><span className="dot" /></span>
        <span className="end">{destLabel}</span>
      </div>

      {annualSavingsUsd != null && aprDeltaPct != null && (
        <div className="save-banner">
          Save {aprDeltaPct.toFixed(1)}% APR, about ${annualSavingsUsd.toFixed(2)} a year on this position.
        </div>
      )}
    </div>
  );
}
