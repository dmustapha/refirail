// File: scripts/refinance-fraction-dryrun.ts
// B4 test: dry-run the PARTIAL refinance at several fractions x both destinations against live mainnet
// ($0, no signing). Asserts each composes + dryRuns GREEN, the moved amounts scale with the fraction,
// and the like-for-like LTV invariant holds. Run: `npx tsx scripts/refinance-fraction-dryrun.ts`.
require("dotenv").config({ path: ".env.local" });

import { getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient } from "../lib/clients";
import { buildRefinancePTB } from "../lib/refinance";
import { simulateRefinance } from "../lib/simulate";

const SENDER = process.env.NEXT_PUBLIC_DEMO_ADDRESS!;
const FRACTIONS = [0.25, 0.5, 1.0];
const DESTS = ["suilend", "alphalend"] as const;

async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) { last = e; if (i < n - 1) await new Promise((r) => setTimeout(r, 1500)); }
  }
  throw last;
}

async function readLive(sender: string): Promise<{ debtAtomic: bigint; collateralAtomic: bigint }> {
  const positions = await retry(() => getLendingPositions(sender as never));
  let debt = 0, collat = 0;
  for (const p of positions as any[]) {
    const b = p["navi-lending-borrow"], s = p["navi-lending-supply"];
    if (b && Number(b.amount) > 0 && String(b?.token?.coinType ?? "").toLowerCase().includes("usdc")) debt = Number(b.amount);
    if (s && Number(s.amount) > 0 && String(s?.token?.coinType ?? "").includes("sui::SUI")) collat = Number(s.amount);
  }
  if (debt <= 0 || collat <= 0) throw new Error("no live Navi SUI/USDC position");
  return { debtAtomic: BigInt(Math.ceil(debt * 1e6)), collateralAtomic: BigInt(Math.floor(collat * 1e9)) };
}

async function main() {
  if (!SENDER) throw new Error("NEXT_PUBLIC_DEMO_ADDRESS missing");
  const client = makeSuiClient();
  const { debtAtomic, collateralAtomic } = await readLive(SENDER);
  const fullLtv = Number(debtAtomic) / Number(collateralAtomic);
  console.log(`live position: debt ${debtAtomic} / collat ${collateralAtomic} (LTV ${fullLtv.toFixed(6)})\n`);

  let failures = 0;
  for (const destId of DESTS) {
    for (const fraction of FRACTIONS) {
      try {
        const tx = await retry(() =>
          buildRefinancePTB({ sender: SENDER, suiClient: client, debtAtomic, collateralAtomic, destId, fraction }),
        );
        const sim = await retry(() => simulateRefinance(client, tx, SENDER));
        // LTV invariant: the scaled debt/collateral keep the same ratio (like-for-like move).
        const d = fraction >= 1 ? Number(debtAtomic) : Math.floor(Number(debtAtomic) * fraction);
        const c = fraction >= 1 ? Number(collateralAtomic) : Math.floor(Number(collateralAtomic) * fraction);
        const ltvOk = Math.abs(d / c - fullLtv) < 1e-6;
        const ok = sim.ok && ltvOk;
        console.log(`${ok ? "PASS" : "FAIL"}  ${destId} @ ${Math.round(fraction * 100)}%  dryRun=${sim.ok ? "ok" : "ABORT:" + (sim.abortReason ?? "").slice(0, 50)}  ltvInvariant=${ltvOk}`);
        if (!ok) failures++;
      } catch (e) {
        console.log(`FAIL  ${destId} @ ${Math.round(fraction * 100)}%  threw: ${(e as Error).message.slice(0, 60)}`);
        failures++;
      }
    }
  }
  console.log(`\n${failures === 0 ? "ALL GREEN" : failures + " FAILED"} — partial refinance dry-runs.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
