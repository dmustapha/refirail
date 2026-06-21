// File: lib/cache.ts
// In-memory TTL memoization for slow, market-WIDE reads (borrow APRs, the AlphaLend market list) that
// change slowly and are identical for every user. Shared across requests in the same server process.
// NEVER use this for a user's position — those must always be read live.
const store = new Map<string, { v: unknown; exp: number }>();

export function ttlMemo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return Promise.resolve(hit.v as T);
  return fn().then((v) => {
    if (v != null) store.set(key, { v, exp: now + ttlMs }); // don't cache nullish (transient failure)
    return v;
  });
}
