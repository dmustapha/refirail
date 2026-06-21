// File: app/components/LiveHeroNumbers.tsx
// Live landing numbers. A small client island so the page stays a Server Component and the entrance
// animations are untouched. Fetches /api/position (+ /api/deleverage at 50% for a real post-paydown
// health) and renders the two hero metrics. If there is no live position or a fetch fails, it falls
// back to the static figures and labels them "illustrative example" (strict no-fabrication stance).
"use client";
import { useEffect, useState } from "react";
import type { PositionView, DeleverageResult } from "@/lib/types";

const DEMO = process.env.NEXT_PUBLIC_DEMO_ADDRESS || "";

type Metric = { from: string; to: string; live: boolean };

// Static fallbacks (the existing hardcoded figures), shown labelled as illustrative when not live.
const STATIC_HEALTH: Metric = { from: "1.86", to: "2.84", live: false };
const STATIC_APR: Metric = { from: "8.4%", to: "6.5%", live: false };

export function LiveHeroNumbers({ which }: { which: "health" | "apr" }) {
  const [health, setHealth] = useState<Metric>(STATIC_HEALTH);
  const [apr, setApr] = useState<Metric>(STATIC_APR);

  useEffect(() => {
    if (!DEMO) return;
    let alive = true;
    (async () => {
      try {
        const pos: PositionView = await fetch(`/api/position?address=${DEMO}&lite=1`).then((r) => r.json());
        if (!alive || !pos?.hasPosition) return;

        // APR: Navi (current) -> cheapest destination. Both live from /api/position.
        const destApr =
          pos.recommendedDest === "alphalend" ? pos.alphalendAprPct : pos.suilendAprPct;
        if (pos.naviAprPct != null && destApr != null) {
          setApr({ from: `${pos.naviAprPct.toFixed(1)}%`, to: `${destApr.toFixed(1)}%`, live: true });
        }

        // Health: current -> projected after a 50% paydown (real dry-run).
        if (pos.healthFactor != null) {
          const dl: DeleverageResult = await fetch("/api/deleverage", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ address: DEMO, fraction: 0.5 }),
          }).then((r) => r.json());
          if (alive && dl?.ok && dl.healthAfter != null) {
            setHealth({
              from: pos.healthFactor.toFixed(2),
              to: dl.healthAfter.toFixed(2),
              live: true,
            });
          }
        }
      } catch {
        // keep the static fallback
      }
    })();
    return () => { alive = false; };
  }, []);

  const m = which === "health" ? health : apr;
  const deltaLabel = which === "health" ? "health ↑" : "APR ↓";

  return (
    <div className="op-num">
      <span className="big">{m.from} &#8594; {m.to}</span>
      <span className="delta">{deltaLabel}</span>
      {!m.live && <span className="op-illus">illustrative example</span>}
    </div>
  );
}
