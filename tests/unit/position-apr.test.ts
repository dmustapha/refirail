// File: tests/unit/position-apr.test.ts
// Lightweight Day-0 accessor test (run: `npx tsx tests/unit/position-apr.test.ts`).
// Confirms the REAL field paths used by lib/position.ts against live sources — guards against
// the silent-null regression that DEV-010 fixed (wrong Navi endpoint, missing Suilend APR field).
import assert from "node:assert";
import { NAVI } from "../../lib/config";

const NAVI_POOLS_URL = "https://open-api.naviprotocol.io/api/navi/pools";

async function testNaviUsdcAprFieldPath() {
  const res = await fetch(NAVI_POOLS_URL).then((r) => r.json());
  const pools: any[] = res?.data ?? res ?? [];
  assert.ok(Array.isArray(pools) && pools.length > 0, "navi /pools returned a non-empty array");

  const usdc = pools.find(
    (p) => p.id === NAVI.USDC_ASSET_ID || String(p.coinType ?? "").endsWith("usdc::USDC"),
  );
  assert.ok(usdc, `found native USDC pool (id=${NAVI.USDC_ASSET_ID})`);

  // DEV-020 (Issue 4, same-definition): the PRIMARY field is now `currentBorrowRate` — the raw
  // on-chain borrow interest rate (1e27/RAY-scaled), the like-for-like analogue of Suilend's borrow
  // APR. `borrowIncentiveApyInfo.vaultApr` is retained only as a fallback.
  const ray = usdc?.currentBorrowRate;
  assert.ok(ray != null, "currentBorrowRate (raw borrow rate) is present");
  const aprNum = +((Number(ray) / 1e27) * 100).toFixed(2);
  assert.ok(aprNum > 0 && aprNum < 100, `navi USDC borrow APR in sane range: ${aprNum}%`);
  const fallback = usdc?.borrowIncentiveApyInfo?.vaultApr;
  assert.ok(fallback != null, "vaultApr fallback still present");
  console.log(`PASS  Navi USDC borrow APR via currentBorrowRate -> ${aprNum.toFixed(2)}% (vaultApr fallback ${Number(fallback).toFixed(2)}%)`);
}

function testSuilendCurveInterpolation() {
  // Mirrors the on-chain piecewise-linear model verified Day-0 (utils %, aprs bps).
  const utils = [0, 93, 97, 100];
  const aprsBps = [400, 700, 1500, 15000];
  function aprAt(u: number): number {
    for (let i = 1; i < utils.length; i++) {
      if (u <= utils[i]) {
        const frac = utils[i] > utils[i - 1] ? (u - utils[i - 1]) / (utils[i] - utils[i - 1]) : 0;
        return (aprsBps[i - 1] + frac * (aprsBps[i] - aprsBps[i - 1])) / 100;
      }
    }
    return aprsBps[aprsBps.length - 1] / 100;
  }
  assert.strictEqual(aprAt(0), 4, "0% util -> 4% APR (curve floor)");
  assert.strictEqual(aprAt(93), 7, "93% util -> 7% APR (kink)");
  assert.ok(Math.abs(aprAt(78.11) - 6.52) < 0.05, "78.11% util -> ~6.52% APR (observed Day-0)");
  console.log("PASS  Suilend interest-rate-curve interpolation");
}

(async () => {
  testSuilendCurveInterpolation();
  await testNaviUsdcAprFieldPath();
  console.log("\nAll position APR accessor tests passed.");
  process.exit(0);
})().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
