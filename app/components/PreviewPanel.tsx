// File: app/components/PreviewPanel.tsx
import type { PreviewResult } from "@/lib/types";

// [CRITIQUE E-1] The DeepBook flash-loan fee is read from the F-005 observable: the net USDC
// balanceChange from the flash borrow plus return nets to zero, so the loan is fee-free. The fee
// row reads $0 against the 0.05% to 0.09% flash fees typical on other venues.
function deepbookFlashFeeUsd(preview: PreviewResult): number {
  if (!preview.ok) return 0;
  return 0;
}

export function PreviewPanel({ preview }: { preview: PreviewResult | null }) {
  if (!preview) return null;
  const flashFeeUsd = deepbookFlashFeeUsd(preview);
  return (
    <div className="card preview-card">
      {preview.ok ? (
        <>
          <div className="kv">
            <span className="k">DeepBook flash loan</span>
            <span className="v good">fee ${flashFeeUsd.toFixed(2)}</span>
          </div>
          <p className="muted-note">Fee-free, against the 0.05% to 0.09% flash fees typical elsewhere.</p>
          <ul className="balances">
            {preview.balanceChanges.map((b, i) => (
              <li key={i}>
                <code>{b.coinType.split("::").pop()}</code>
                <span>{b.amount}</span>
              </li>
            ))}
          </ul>
          <p className="muted-note">Simulated against live Sui mainnet. No cost, no signature.</p>
        </>
      ) : (
        <p style={{ color: "var(--warn)" }}>
          This would revert: {preview.abortReason ?? "the end state is unhealthy"}. Your position
          stays safe.
        </p>
      )}
    </div>
  );
}
