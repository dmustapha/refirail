// File: tests/unit/deleverage.test.ts
// T1 unit tests (run: `npx tsx tests/unit/deleverage.test.ts`). Pure logic, NO network — a
// deterministic fake DeepBook client makes sizing assertable against known values. Covers:
//   - sizeDeleverage: fraction validation, repay floor, two-hop min-floor clamp, position-too-small
//   - computeDeleverageEconomics: Navi-side healthAfter (matches the real proof tx: 1.89 → ~2.93)
//   - pickBestRoute: fee-free two-hop wins unless a fee-free direct route yields more
import assert from "node:assert";
import { sizeDeleverage, MIN_SUI_SELL } from "../../lib/deleverageQuote";
import { computeDeleverageEconomics, pickBestRoute } from "../../lib/deleverageEconomics";

// Fake DeepBook: 1 SUI → 10 DEEP → 0.71 USDC  (linear, fee-free). Mirrors getQuantityOut's shape.
const fakeDb: any = {
  async getQuantityOut(poolKey: string, base: number, quote: number) {
    if (poolKey === "DEEP_SUI") return { baseOut: quote * 10, quoteOut: 0, deepRequired: 0 }; // SUI(quote)→DEEP(base)
    if (poolKey === "DEEP_USDC") return { baseOut: 0, quoteOut: base * 0.071, deepRequired: 0 }; // DEEP(base)→USDC(quote)
    throw new Error("unknown pool " + poolKey);
  },
};
const approx = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

async function testSizingValidation() {
  for (const f of [0, -0.5, 1.0, 1.5]) {
    const r = await sizeDeleverage(fakeDb, 2_000_000n, f, 100);
    assert.ok(!r.ok, `fraction ${f} rejected`);
  }
  console.log("PASS  sizeDeleverage rejects out-of-range fractions");
}

async function testRepayFloor() {
  const r = await sizeDeleverage(fakeDb, 1n, 0.25, 100); // floor(0.25)=0 atomic → no repay
  assert.ok(!r.ok && /too small/.test(r.reason ?? ""), "dust debt → 'debt too small'");
  console.log("PASS  sizeDeleverage rejects dust debt (repay floors to 0)");
}

async function testNormalSizing() {
  // 2 USDC debt, 50% → repay 1.0 USDC. suiToSell = (1.0 × 1.05 / 0.71) × 1.02 ≈ 1.5085 SUI.
  const r = await sizeDeleverage(fakeDb, 2_000_000n, 0.5, 100);
  assert.ok(r.ok, "ok");
  assert.strictEqual(r.repayAtomic, 1_000_000n, "repayAtomic = floor(debt×fraction)");
  assert.ok(approx(r.repayHuman, 1.0), "repayHuman 1.0");
  assert.ok(approx(r.suiToSell, 1.5085, 0.01), `suiToSell ≈ 1.5085 (got ${r.suiToSell})`);
  assert.ok(approx(r.effPricePerSui, 0.71), "effPricePerSui 0.71");
  assert.strictEqual(r.collateralAtomic, BigInt(Math.ceil(r.suiToSell * 1e9)), "collateralAtomic = ceil(suiToSell×1e9)");
  console.log(`PASS  sizeDeleverage normal case (sell ${r.suiToSell} SUI for ${r.repayHuman} USDC)`);
}

async function testMinFloorClamp() {
  // 0.2 USDC debt, 25% → repay 0.05 → suiToSell ≈ 0.0755 < floor → clamps to MIN_SUI_SELL (0.35).
  const r = await sizeDeleverage(fakeDb, 200_000n, 0.25, 100);
  assert.ok(r.ok, "ok");
  assert.strictEqual(r.suiToSell, MIN_SUI_SELL, `clamped to floor ${MIN_SUI_SELL}`);
  console.log("PASS  sizeDeleverage clamps tiny slices to the two-hop floor");
}

async function testPositionTooSmall() {
  // 2 USDC debt, 90% → repay 1.8 → suiToSell ≈ 2.716 SUI, but only 1.0 SUI collateral available.
  const r = await sizeDeleverage(fakeDb, 2_000_000n, 0.9, 1.0);
  assert.ok(!r.ok && /too small/.test(r.reason ?? ""), "position too small for this %");
  console.log("PASS  sizeDeleverage rejects when SUI needed > collateral");
}

function testEconomicsHealthRises() {
  // The REAL proof-tx scenario (digest 4S5bhsgZ): 15 SUI/$10.66 collat, $4.51 debt, health 1.89,
  // sell 3.41 SUI, repay 2.256 → on-chain health was 2.92.
  const e = computeDeleverageEconomics({
    collatBeforeUsd: 10.66, debtBeforeUsd: 4.51, collatHuman: 15,
    suiToSell: 3.41, repayHuman: 2.256, healthBefore: 1.89,
  });
  assert.ok(approx(e.collatAfterUsd, 8.24, 0.02), `collatAfter ≈ 8.24 (got ${e.collatAfterUsd})`);
  assert.ok(approx(e.debtAfterUsd, 2.25, 0.02), `debtAfter ≈ 2.25 (got ${e.debtAfterUsd})`);
  assert.ok(e.healthAfter! > 1.89, "health RISES after deleverage");
  assert.ok(approx(e.healthAfter!, 2.92, 0.05), `healthAfter ≈ 2.92 matches on-chain (got ${e.healthAfter})`);
  console.log(`PASS  economics: health ${1.89} → ${e.healthAfter} (matches on-chain proof tx)`);
}

function testEconomicsFullRepay() {
  // Full debt repaid → debtAfter 0 → healthAfter undefined (no division by zero, honest).
  const e = computeDeleverageEconomics({
    collatBeforeUsd: 10, debtBeforeUsd: 2, collatHuman: 14, suiToSell: 3, repayHuman: 2, healthBefore: 2,
  });
  assert.strictEqual(e.debtAfterUsd, 0, "debtAfter 0");
  assert.strictEqual(e.healthAfter, undefined, "healthAfter undefined when debt cleared");
  console.log("PASS  economics: full repay → healthAfter undefined (no NaN)");
}

function testRouteSelection() {
  const twoHop = { usdcOut: 0.71, available: true };
  assert.strictEqual(pickBestRoute(twoHop, { usdcOut: 0.72, deepFee: 0.008, available: true }), "twoHop", "direct charging DEEP loses");
  assert.strictEqual(pickBestRoute(twoHop, { usdcOut: 0, deepFee: 0, available: false }), "twoHop", "unavailable direct loses");
  assert.strictEqual(pickBestRoute(twoHop, { usdcOut: 0.72, deepFee: 0, available: true }), "direct", "fee-free higher-yield direct wins");
  assert.strictEqual(pickBestRoute(twoHop, { usdcOut: 0.70, deepFee: 0, available: true }), "twoHop", "fee-free lower-yield direct loses");
  console.log("PASS  pickBestRoute prefers fee-free two-hop unless a fee-free direct yields more");
}

(async () => {
  await testSizingValidation();
  await testRepayFloor();
  await testNormalSizing();
  await testMinFloorClamp();
  await testPositionTooSmall();
  testEconomicsHealthRises();
  testEconomicsFullRepay();
  testRouteSelection();
  console.log("\nAll deleverage unit tests passed.");
  process.exit(0);
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
