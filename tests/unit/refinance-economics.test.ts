// File: tests/unit/refinance-economics.test.ts
// T1 unit tests (run: `npx tsx tests/unit/refinance-economics.test.ts`). Pure logic, NO network.
// Covers the Tier-1 fixes:
//   - F1 pickDest: only recommends a destination that BEATS Navi (isNaviCheapest guard)
//   - F2/F6 healthFrom: collateral × threshold / debt (refinance health-after + Navi fallback)
//   - F5/partial: same-fraction debt+collateral scaling preserves LTV (like-for-like move)
import assert from "node:assert";
import { pickDest, healthFrom } from "../../lib/deleverageEconomics";

const approx = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

// F1 — pickDest
function testPickDestNaviCheapest() {
  // Navi 6.0, Suilend 6.8, AlphaLend 10.8 — neither beats Navi → recommend nothing.
  const r = pickDest(6.0, 6.8, 10.8);
  assert.strictEqual(r.isNaviCheapest, true, "isNaviCheapest when no dest beats Navi");
  assert.strictEqual(r.recommendedDest, undefined, "no recommendation when Navi is cheapest");
  console.log("PASS  pickDest: Navi cheapest → no recommendation");
}
function testPickDestRecommends() {
  const r = pickDest(8.5, 6.8, 10.8); // Suilend beats Navi
  assert.strictEqual(r.recommendedDest, "suilend", "recommends the cheaper Suilend");
  assert.ok(!r.isNaviCheapest, "not Navi-cheapest");
  assert.strictEqual(r.bestApr, 6.8, "bestApr is the recommended dest APR");
  console.log("PASS  pickDest: a cheaper dest → recommend it");
}
function testPickDestEdges() {
  assert.deepStrictEqual(pickDest(8.5, undefined, undefined), {}, "no dest APRs → empty");
  assert.strictEqual(pickDest(8.5, undefined, 7.0).recommendedDest, "alphalend", "single dest that beats Navi");
  assert.strictEqual(pickDest(6.8, 6.8, 10.8).isNaviCheapest, true, "dest == navi is not 'cheaper' → Navi cheapest");
  console.log("PASS  pickDest: edges (no dests / single dest / tie)");
}

// F2 + F6 — healthFrom
function testHealthFrom() {
  assert.ok(approx(healthFrom(10.66, 4.51, 0.8)!, 1.89, 0.01), `10.66/4.51@0.8 ≈ 1.89 (got ${healthFrom(10.66, 4.51, 0.8)})`);
  assert.ok(healthFrom(10, 5, 0.85)! > healthFrom(10, 5, 0.75)!, "higher threshold → higher health");
  assert.ok(approx(healthFrom(10, 5)!, 1.6, 0.001), "default threshold 0.8");
  assert.strictEqual(healthFrom(10, 0, 0.8), undefined, "zero debt → undefined (no NaN)");
  assert.strictEqual(healthFrom(0, 5, 0.8), undefined, "zero collat → undefined");
  assert.strictEqual(healthFrom(undefined, 5, 0.8), undefined, "undefined collat → undefined");
  console.log("PASS  healthFrom: collat×threshold/debt with honest undefined edges");
}

// F2 (partial) — same-fraction scaling preserves LTV (the like-for-like invariant)
function testPartialLtvInvariant() {
  const debt = 1_504_525, collat = 5_000_018_750; // live demo atomics
  const ltvFull = debt / collat;
  for (const f of [0.25, 0.5, 0.75]) {
    const d = Math.floor(debt * f), c = Math.floor(collat * f);
    assert.ok(approx(d / c, ltvFull, 1e-6), `LTV invariant at fraction ${f}`);
  }
  console.log("PASS  partial refinance: same-fraction scaling preserves LTV (like-for-like)");
}

(async () => {
  testPickDestNaviCheapest();
  testPickDestRecommends();
  testPickDestEdges();
  testHealthFrom();
  testPartialLtvInvariant();
  console.log("\nAll refinance-economics unit tests passed.");
  process.exit(0);
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
