// File: app/components/DeepBookPanel.tsx
// Live DeepBook order-book panel (S1 best-execution proof + desktop-void filler). Polls /api/deepbook.
// Shows mid, the route comparison (fee-free two-hop vs DEEP-charging direct), and real depth bars.
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
      <div className="card dbk">
        <span className="tag">DeepBook · live order book</span>
        <p className="tag note">Connecting to the order book…</p>
      </div>
    );
  }

  const maxQty = Math.max(1, ...v.depth.asks.map((a) => a.qty), ...v.depth.bids.map((b) => b.qty));
  const bar = (pct: number) => ({ ["--w" as any]: `${Math.max(2, Math.min(100, pct))}%` });

  return (
    <div className="card dbk">
      <span className="tag">DeepBook · live order book</span>
      <div className="row">
        <span>SUI / USDC mid</span>
        <b className="flash">${v.midSuiUsdc.toFixed(4)}</b>
      </div>

      <div className="routes">
        <div className={`route${v.best === "twoHop" ? " win" : ""}`}>
          <span>SUI → DEEP → USDC</span>
          <b className="good">fee $0</b>
          <em>{v.twoHop.usdcOut.toFixed(4)} / SUI</em>
        </div>
        <div className={`route${v.best === "direct" ? " win" : ""}`}>
          <span>SUI → USDC · direct</span>
          <b className="bad">needs DEEP</b>
          <em>{v.direct.available ? v.direct.usdcOut.toFixed(4) + " / SUI" : "—"}</em>
        </div>
      </div>
      <p className="tag note">
        Best execution: routed through the whitelisted DEEP pairs — zero fee, no DEEP held.
      </p>

      {v.depth.asks.length > 0 && (
        <div className="depth" aria-hidden="true">
          {v.depth.asks.slice().reverse().map((a, i) => (
            <div key={"a" + i} className="dlvl">
              <i className="bar ask" style={bar((a.qty / maxQty) * 100)} />
              <code>{a.price.toFixed(4)}</code>
            </div>
          ))}
          <div className="dmid">mid ${v.midSuiUsdc.toFixed(4)}</div>
          {v.depth.bids.map((b, i) => (
            <div key={"b" + i} className="dlvl">
              <i className="bar bid" style={bar((b.qty / maxQty) * 100)} />
              <code>{b.price.toFixed(4)}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
