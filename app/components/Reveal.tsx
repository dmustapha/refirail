// File: app/components/Reveal.tsx
// Entrance + scroll reveals. Renders nothing; on mount it marks the document JS-ready (so no-JS
// keeps content visible), then reveals each .reveal element as it enters the viewport. A
// MutationObserver catches elements rendered later (e.g. async-loaded workspace content).
"use client";
import { useEffect } from "react";

export function Reveal() {
  useEffect(() => {
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window);
    document.documentElement.classList.add("js-ready");

    const io = reduce
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                en.target.classList.add("in");
                io!.unobserve(en.target);
              }
            });
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
        );

    const take = (el: Element) => {
      if (reduce || !io) el.classList.add("in");
      else io.observe(el);
    };
    const scan = (root: ParentNode) => {
      root.querySelectorAll?.(".reveal:not(.in)").forEach(take);
    };

    // Delay the FIRST scan so the entrance plays a beat AFTER the page is painted and the eye has
    // landed — otherwise the whole hero animates and settles within ~0.5s of load, before anyone is
    // looking, and reads as a static page. Scroll reveals are unaffected (they fire on scroll). The
    // MutationObserver below still catches async content immediately.
    const firstScan = reduce
      ? (scan(document), null)
      : setTimeout(() => scan(document), 320);

    const mo = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as Element;
          if (el.classList?.contains("reveal")) take(el);
          scan(el);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (firstScan) clearTimeout(firstScan);
      mo.disconnect();
      io?.disconnect();
    };
  }, []);

  return null;
}
