// File: app/components/DestinationPicker.tsx
// Refinance destination router: scans every venue, routes to the cheapest borrow APR by default,
// and lets the user pick manually. Navi is the source (current). Suilend and AlphaLend are the
// destinations. The cheapest destination is tagged "best rate". Every APR is live from
// /api/position (no fabrication): a venue with no APR is greyed and cannot be selected.
"use client";

export type DestId = "suilend" | "alphalend";

const LABEL: Record<DestId, string> = { suilend: "Suilend", alphalend: "AlphaLend" };

export function DestinationPicker({
  selected,
  recommended,
  onSelect,
  naviAprPct,
  suilendAprPct,
  alphalendAprPct,
  isNaviCheapest,
  disabled,
}: {
  selected: DestId;
  recommended: DestId;
  onSelect: (d: DestId) => void;
  naviAprPct?: number;
  suilendAprPct?: number;
  alphalendAprPct?: number;
  isNaviCheapest?: boolean;
  disabled?: boolean;
}) {
  const apr: Record<DestId, number | undefined> = {
    suilend: suilendAprPct,
    alphalend: alphalendAprPct,
  };
  // Cheapest destination among the venues that quoted an APR — but only if one actually beats Navi.
  // When Navi is already cheapest (F1), no destination is "best", so no venue gets the tag.
  const cheapest = isNaviCheapest ? null : (cheapestDest(suilendAprPct, alphalendAprPct) ?? recommended);

  return (
    <div className="dest-pick">
      <p className="dp-eyebrow">
        {isNaviCheapest ? "Destination · Navi already has the best rate" : "Destination · routed to the best rate"}
      </p>
      <div className="dp-strip" role="group" aria-label="Choose refinance destination">
        <div className="venue venue-src" aria-hidden="true">
          <span className="vn">Navi</span>
          <span className="vtag">Current</span>
          <span className="vapr hi">{fmtApr(naviAprPct)}</span>
        </div>
        {(["suilend", "alphalend"] as DestId[]).map((d) => {
          const a = apr[d];
          const unavailable = a == null;
          const isSel = selected === d;
          const isBest = cheapest === d && !unavailable;
          return (
            <button
              key={d}
              type="button"
              className="venue venue-dest"
              aria-pressed={isSel}
              disabled={disabled || unavailable}
              onClick={() => onSelect(d)}
              title={unavailable ? `${LABEL[d]} rate unavailable right now` : undefined}
            >
              <span className="vn">{LABEL[d]}</span>
              {isBest ? (
                <span className="vtag best">Best rate</span>
              ) : (
                <span className="vtag">{unavailable ? "Unavailable" : "Destination"}</span>
              )}
              <span className={`vapr${isBest ? " good" : ""}`}>{fmtApr(a)}</span>
            </button>
          );
        })}
      </div>
      <p className="dp-hint">
        {isNaviCheapest
          ? "Navi currently offers the lowest borrow rate. Moving would raise your APR, so we recommend staying put."
          : "RefiRail scans every venue and routes to the cheapest borrow APR. You can also pick manually."}
      </p>
    </div>
  );
}

function cheapestDest(suilend?: number, alphalend?: number): DestId | null {
  const candidates: [DestId, number][] = [];
  if (suilend != null) candidates.push(["suilend", suilend]);
  if (alphalend != null) candidates.push(["alphalend", alphalend]);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a[1] - b[1])[0][0];
}

function fmtApr(v?: number): string {
  return v != null ? `${v.toFixed(1)}%` : "n/a";
}
