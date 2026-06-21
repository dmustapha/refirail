// File: app/components/TxLink.tsx
"use client";
import { useEffect, useRef } from "react";
import { EXPLORER } from "@/lib/config";

// TxLink only ever renders inside a post-settle success card. On a tall operation panel that card can
// land below the fold, so the user signs, sees no confirmation, and assumes nothing happened. Scroll
// the result into view the moment it mounts so the success state + Suiscan link are always visible.
export function TxLink({ digest }: { digest: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [digest]);
  return (
    <a ref={ref} className="txlink" href={EXPLORER.tx(digest)} target="_blank" rel="noreferrer">
      View on Suiscan
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
