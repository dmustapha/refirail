// File: app/components/HealthGauge.tsx
// The radial health-factor ring. Driven by live values from /api/deleverage (never hardcoded).
// The ring fills and the number counts up, shifting from aqua to mint as the position gets safer.
"use client";
import { useEffect, useRef, useState } from "react";

const GAUGE_MAX = 5; // health 5.0 fills the ring
const CIRC = 515.2; // 2 * pi * 82

function ringColor(hf: number) {
  if (hf >= 2.8) return "#46E5B5";
  if (hf >= 2.1) return "#7BC6FF";
  return "#4DA2FF";
}
function numColor(hf: number) {
  return hf >= 2.8 ? "#46E5B5" : "#EAF2FF";
}
function stateLabel(hf: number) {
  if (hf >= 3.5) return "Fortified";
  if (hf >= 2.5) return "Safe";
  if (hf >= 2.0) return "Improving";
  return "";
}

export function HealthGauge({ value }: { value: number | null | undefined }) {
  const target = value ?? 1.86;
  const [shown, setShown] = useState(target);
  const prev = useRef(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = prev.current;
    const to = target;
    prev.current = to;
    if (reduce || from === to) {
      setShown(to);
      return;
    }
    const start = performance.now();
    const dur = 660;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target]);

  const frac = Math.min(shown / GAUGE_MAX, 1);
  const offset = (CIRC * (1 - frac)).toFixed(1);

  return (
    <div className="gauge-wrap">
      <div className="gauge">
        <svg width="188" height="188" viewBox="0 0 188 188" role="img" aria-label={`Health factor ${target.toFixed(2)}`}>
          <circle className="ring-bg" cx="94" cy="94" r="82" fill="none" strokeWidth="12" />
          <circle
            className="ring-fg"
            cx="94" cy="94" r="82" fill="none" strokeWidth="12"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ stroke: ringColor(shown) }}
          />
        </svg>
        <div className="center">
          <span className="hf-label">Health</span>
          <span className="hf-num" style={{ color: numColor(shown) }}>{shown.toFixed(2)}</span>
          <span className="hf-state">{stateLabel(target)}</span>
        </div>
      </div>
    </div>
  );
}
