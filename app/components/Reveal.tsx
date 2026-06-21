// File: app/components/Reveal.tsx
// Global scroll-reveal observer (mounted once per page). Adds `.in` to every `.reveal` element as it
// scrolls into view; CSS `.reveal.in` plays the keyframe rise. A MutationObserver picks up `.reveal`
// nodes rendered later (async workspace content). This is the exact proven pattern from the
// Mantle/AlphaAttest builds — unconditional `.reveal{opacity:0}` + keyframe, no js-ready gating.
"use client";
import { useEffect } from "react";

export function Reveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    const observeAll = () =>
      document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
