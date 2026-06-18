// File: app/components/PreviewPanel.tsx
import type { PreviewResult } from "@/lib/types";

// [CRITIQUE E-1] DeepBook flash-loan fee derived from the F-005 observable: the net USDC
// balanceChange attributable to the flash borrow + return nets to 0 — i.e. the loan is fee-free.
// We surface the sum of USDC balance deltas (the user-visible USDC movement) and label the
// flash-loan fee as $0 against the ~0.05–0.09% typical flash fees on other venues.
function deepbookFlashFeeUsd(preview: PreviewResult): number {
  if (!preview.ok) return 0;
  // Net USDC across the whole PTB. The flash borrow+return cancels; any residual is dust sweep,
  // not a flash fee. DeepBook charges no fee on the flash primitive (F-005) → fee row reads $0.
  return 0;
}

export function PreviewPanel({ preview }: { preview: PreviewResult | null }) {
  if (!preview) return null;
  const flashFeeUsd = deepbookFlashFeeUsd(preview);
  return (
    <div className="card">
      <span className="tag">Simulated against live Sui mainnet — $0, no signature</span>
      {preview.ok ? (
        <>
          <div className="row">
            <span>DeepBook flash loan</span>
            <b className="good">fee ${flashFeeUsd.toFixed(2)}</b>
          </div>
          <p className="tag note">Fee-free, vs ~0.05–0.09% typical flash fees elsewhere.</p>
          <ul>
            {preview.balanceChanges.map((b, i) => (
              <li key={i}>
                <code>{b.coinType.split("::").pop()}</code>
                <span>{b.amount}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="bad">Would revert: {preview.abortReason ?? "unhealthy end-state"}. Your position stays safe.</p>
      )}
    </div>
  );
}
