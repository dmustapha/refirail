// File: app/components/TxLink.tsx
import { EXPLORER } from "@/lib/config";
export function TxLink({ digest }: { digest: string }) {
  return (
    <a className="txlink" href={EXPLORER.tx(digest)} target="_blank" rel="noreferrer">
      View on Suiscan ↗
    </a>
  );
}
