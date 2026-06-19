// File: lib/warm.ts
// Issue 7 (latency): kick off the slow gRPC (Suilend) init + a DeepBook read on the FIRST request so
// the first user-facing preview isn't a ~12s cold start. Memoized fire-and-forget; never throws.
import { initSuilend } from "./protocols/suilend";
import { makeSuiClient } from "./clients";
import { makeDeepBook } from "./protocols/deepbook";

const READ_SENDER = "0x0000000000000000000000000000000000000000000000000000000000000001";
let warmed: Promise<unknown> | null = null;

export function warm(): Promise<unknown> {
  if (!warmed) {
    const c = makeSuiClient();
    const db = makeDeepBook(c, READ_SENDER);
    warmed = Promise.allSettled([initSuilend(), db.midPrice("SUI_USDC")]);
  }
  return warmed;
}
