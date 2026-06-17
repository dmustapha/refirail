// File: scripts/refine-dryrun.ts
// Day-1 GATE (RISK 1 + RISK 4 — the pivot): dry-run the FULL cross-protocol atomic refinance
// against live Sui mainnet for $0. GREEN here = the whole project is de-risked. dryRun spends NOTHING.
//
// Derived from ARCHITECTURE.md §14, adapted to the REAL position opened in Task 1.6 (DEV-015):
//   - The §14 sketch hardcodes usdcAtomic(1)/suiAtomic(3); reality is a 1.0 SUI collateral /
//     ~0.3009-and-accruing USDC debt position. Per the binding rules + decision tree, the debt is
//     read JUST-IN-TIME from the live Navi position so the flash amount covers debt+accrued.
//   - gRPC (Suilend init) intermittently throws "RpcError: fetch failed" -> retry up to 3x.
//   - bufferBps is overridable via BUFFER_BPS env for the free decision-tree iteration (30 -> 80 -> 150).
require("dotenv").config({ path: ".env.local" });

import { getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { buildRefinancePTB } from "../lib/refinance";
import { simulateRefinance } from "../lib/simulate";
import { suiAtomic, usdcHuman, suiHuman } from "../lib/amounts";
import { computeFlashAmounts } from "../lib/amounts";

const COLLATERAL_SUI = 1.0; // matches the Task 1.6 position (1.0 SUI deposited as Navi collateral)
const BUFFER_BPS = Number(process.env.BUFFER_BPS ?? 30); // flash over-borrow buffer (decision-tree tunable)

async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      console.warn(`  retry ${i + 1}/${n} after error:`, (e as Error)?.message ?? e);
      if (i < n - 1) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw last;
}

// JUST-IN-TIME live debt read. The Navi SDK returns navi-lending-borrow.amount as a HUMAN-units
// string (e.g. "0.3009"); convert to atomic (6 dp). The debt accrues, so this is read at build time.
async function readLiveDebtAtomic(sender: string): Promise<bigint> {
  const positions = await retry(() => getLendingPositions(sender as never));
  for (const p of positions) {
    const b: any = p["navi-lending-borrow"];
    const coinType = String(b?.pool?.coinType ?? b?.token?.coinType ?? "");
    if (b && Number(b.amount) > 0 && coinType.toLowerCase().includes("usdc")) {
      const human = Number(b.amount);
      // round UP to the next atomic unit so we never under-cover the true debt
      const atomic = BigInt(Math.ceil(human * 10 ** 6));
      return atomic;
    }
  }
  throw new Error("No live Navi USDC borrow found — open the position first (scripts/open-position.ts).");
}

async function main() {
  const client = makeSuiClient();
  const sender = makeDemoKeypair().getPublicKey().toSuiAddress();
  console.log("sender:", sender);

  // 1. live debt (just-in-time)
  const debtAtomic = await readLiveDebtAtomic(sender);
  const { flashAtomic, flashHuman } = computeFlashAmounts(debtAtomic, BUFFER_BPS);
  console.log(`live Navi debt: ${usdcHuman(debtAtomic)} USDC (${debtAtomic} atomic)`);
  console.log(`bufferBps: ${BUFFER_BPS}`);
  console.log(`flash / Suilend borrow: ${flashHuman} USDC (${flashAtomic} atomic)`);
  console.log(`collateral to move: ${COLLATERAL_SUI} SUI (${suiAtomic(COLLATERAL_SUI)} atomic)`);

  // 2. compose the 10-cmd hero PTB (retry: Suilend init does gRPC inside buildRefinancePTB)
  const tx = await retry(() =>
    buildRefinancePTB({
      sender,
      suiClient: client,
      debtAtomic,
      collateralAtomic: suiAtomic(COLLATERAL_SUI),
      bufferBps: BUFFER_BPS,
    }),
  );

  // 3. dry-run for $0
  const sim = await simulateRefinance(client, tx, sender);
  console.log("\ndryRun ok:", sim.ok);
  if (!sim.ok) console.error("abort:", sim.abortReason);
  console.log("balanceChanges:", JSON.stringify(sim.balanceChanges, null, 2));

  // net summary (the proof: SUI net ~ -gas, USDC net ~ 0)
  const net = (needle: string) =>
    sim.balanceChanges
      .filter((b) => b.coinType.toLowerCase().includes(needle))
      .reduce((s, b) => s + BigInt(b.amount), 0n);
  const suiNet = sim.balanceChanges
    .filter((b) => b.coinType === "0x2::sui::SUI")
    .reduce((s, b) => s + BigInt(b.amount), 0n);
  const usdcNet = net("usdc::usdc");
  console.log(`\nSUI net:  ${suiHuman(suiNet)} SUI (${suiNet} atomic)`);
  console.log(`USDC net: ${usdcHuman(usdcNet)} USDC (${usdcNet} atomic)`);

  process.exit(sim.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
