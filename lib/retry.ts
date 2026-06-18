// File: lib/retry.ts
// DEV-019: shared transient-retry for the Suilend gRPC path. The headless scripts wrapped
// buildRefinancePTB in a local 3x retry; lib/ did not, so the live /api/preview route would
// crash with a 503 on a transient gRPC blip during the demo. This helper moves the retry into
// the SHARED path so BOTH API routes and scripts benefit, and — critically — retries ONLY the
// known-transient gRPC signatures. A real Move abort / ok:false is NOT transient: it surfaces
// immediately so the dryRun truth (e.g. no-position) is never masked by a retry loop.
//
// Transient signatures observed against live mainnet gRPC:
//   - "RpcError: fetch failed"                                   (gRPC-web transport blip)
//   - "Cannot read properties of undefined (reading 'package')"  (Pyth getPackageId race in refreshAll)

const TRANSIENT_PATTERNS = [
  "fetch failed",
  "reading 'package'",
  "rpcerror",
  "etimedout",
  "econnreset",
  "socket hang up",
  "503",
  "502",
  "network",
] as const;

export function isTransientGrpcError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  if (!msg) return false;
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

// Retry `fn` up to `tries` times, but ONLY when the thrown error is a known-transient gRPC error.
// Non-transient errors (real aborts, bad input, etc.) re-throw immediately. Linear backoff.
export async function withRetry<T>(
  fn: () => Promise<T>,
  tries = 3,
  backoffMs = 1500,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientGrpcError(e)) throw e; // non-transient → surface immediately
      if (i < tries - 1) {
        // eslint-disable-next-line no-console
        console.warn(
          `[withRetry] transient gRPC error ${i + 1}/${tries}, retrying in ${backoffMs}ms:`,
          (e as Error)?.message ?? e,
        );
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw last;
}
