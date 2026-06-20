// File: app/components/TxLink.tsx
import { EXPLORER } from "@/lib/config";

export function TxLink({ digest }: { digest: string }) {
  return (
    <a className="txlink" href={EXPLORER.tx(digest)} target="_blank" rel="noreferrer">
      View on Suiscan
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
