// File: app/components/DeepBookPanel.tsx
// Live DeepBook best-execution panel. Polls /api/deepbook. Fee-free two-hop winner vs DEEP-charging
// direct route, plus a real SUI/USDC order-book depth ladder.
"use client";
import { useEffect, useState } from "react";
import type { DeepBookView } from "@/lib/types";

export function DeepBookPanel() {
  const [v, setV] = useState<DeepBookView | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/deepbook")
        .then((r) => r.json())
        .then((d) => { if (alive && d && d.midSuiUsdc) setV(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!v) {
    return (
      <div className="db-grid">
        <div className="card"><p className="card-label">Route comparison</p><p className="muted-note">Reading the order book.</p></div>
        <div className="card"><p className="card-label">SUI / USDC order book</p><p className="muted-note">Reading the order book.</p></div>
      </div>
    );
  }

  const twoHopWins = v.best === "twoHop";
  const maxQty = Math.max(1, ...v.depth.asks.map((a) => a.qty), ...v.depth.bids.map((b) => b.qty));
  const width = (qty: number) => `${Math.max(8, Math.min(100, (qty / maxQty) * 100))}%`;

  return (
    <div className="db-grid">
      <div className="card">
        <p className="card-label">Route comparison</p>
        <div className={`route${twoHopWins ? " winner" : ""}`} style={{ marginBottom: 16 }}>
          {twoHopWins && <span className="r-badge">Winner</span>}
          <div className="r-top"><span className="r-tag">Route A · two-hop</span></div>
          <p className="r-path">SUI &#8594; DEEP &#8594; USDC</p>
          <div className="r-fee"><span className="amt">$0</span><span className="lab">fee</span></div>
        </div>
        <div className={`route${!twoHopWins ? " winner" : ""}`}>
          {!twoHopWins && <span className="r-badge">Winner</span>}
          <div className="r-top"><span className="r-tag">Route B · direct</span></div>
          <p className="r-path">SUI &#8594; USDC</p>
          <div className="r-fee"><span className="amt">needs DEEP</span><span className="lab">DEEP fee</span></div>
          <p className="r-status">Charges a DEEP fee the wallet does not hold.</p>
        </div>
        <p className="db-note">
          Best execution routes through the whitelisted DEEP pairs. Zero fee, no DEEP held. The
          two-hop wins outright.
        </p>
      </div>

      <div className="card">
        <p className="card-label">SUI / USDC order book</p>
        <div className="ladder">
          <div className="ladder-head">
            <span className="lh-mid">mid <b>${v.midSuiUsdc.toFixed(4)}</b></span>
            <span className="lh-mid" style={{ color: "var(--ivory-faint)" }}>depth</span>
          </div>
          {v.depth.asks.slice().reverse().map((a, i) => (
            <div key={"a" + i} className="lad-row ask">
              <span className="lp">{a.price.toFixed(4)}</span>
              <span className="lq">{a.qty.toLocaleString()}</span>
              <span className="bar" style={{ width: width(a.qty) }} />
            </div>
          ))}
          <div className="lad-mid">mid ${v.midSuiUsdc.toFixed(4)}</div>
          {v.depth.bids.map((b, i) => (
            <div key={"b" + i} className="lad-row bid">
              <span className="lp">{b.price.toFixed(4)}</span>
              <span className="lq">{b.qty.toLocaleString()}</span>
              <span className="bar" style={{ width: width(b.qty) }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
