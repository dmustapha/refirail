// File: scripts/refine-partial-execute.ts
// B5: execute ONE REAL *partial* refinance Navi -> {DEST} for a fraction of the position, on mainnet.
// Proves partial refinance on-chain AND (for DEST=suilend) creates a real Suilend obligation that
// exercises getSuilendPositions' parse path + makes the picker show all three lenders. Navi keeps the
// rest, so it stays the actionable source. Spends real gas (~0.04 SUI), IRREVERSIBLE.
//   DEST=suilend FRACTION=0.3 npx tsx scripts/refine-partial-execute.ts
require("dotenv").config({ path: ".env.local" });

import { writeFileSync, mkdirSync } from "node:fs";
import { getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { buildRefinancePTB, type DestId } from "../lib/refinance";
import { simulateRefinance } from "../lib/simulate";
import { EXPLORER } from "../lib/config";

const DEST = (process.env.DEST === "alphalend" ? "alphalend" : "suilend") as DestId;
const FRACTION = Number(process.env.FRACTION ?? 0.3);

async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) { last = e; console.warn(`  retry ${i + 1}/${n}:`, (e as Error)?.message ?? e); if (i < n - 1) await new Promise((r) => setTimeout(r, 1500)); }
  }
  throw last;
}

async function readLive(sender: string) {
  const positions = await retry(() => getLendingPositions(sender as never));
  let debtHuman = 0, collatHuman = 0;
  for (const p of positions as any[]) {
    const b = p["navi-lending-borrow"], s = p["navi-lending-supply"];
    if (b && Number(b.amount) > 0 && String(b?.token?.coinType ?? "").toLowerCase().includes("usdc")) debtHuman = Number(b.amount);
    if (s && Number(s.amount) > 0 && String(s?.token?.coinType ?? "").includes("sui::SUI")) collatHuman = Number(s.amount);
  }
  if (debtHuman <= 0 || collatHuman <= 0) throw new Error("no live Navi SUI/USDC position");
  return { debtAtomic: BigInt(Math.ceil(debtHuman * 1e6)), collateralAtomic: BigInt(Math.floor(collatHuman * 1e9)), debtHuman, collatHuman };
}

async function main() {
  if (!(FRACTION > 0 && FRACTION <= 1)) throw new Error("FRACTION must be in (0,1]");
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();
  console.log(`sender: ${sender}\ndest: ${DEST} | fraction: ${FRACTION}`);

  const { debtAtomic, collateralAtomic, debtHuman, collatHuman } = await readLive(sender);
  console.log(`live: ${collatHuman} SUI / ${debtHuman} USDC -> moving ${Math.round(FRACTION * 100)}% to ${DEST}`);

  const tx = await retry(() =>
    buildRefinancePTB({ sender, suiClient: client, debtAtomic, collateralAtomic, destId: DEST, fraction: FRACTION }),
  );
  const sim = await retry(() => simulateRefinance(client, tx, sender));
  console.log("pre-execute dryRun ok:", sim.ok);
  if (!sim.ok) { console.error("ABORT:", sim.abortReason); process.exit(1); }

  console.log("\n>>> signing + executing REAL mainnet tx (irreversible)...");
  const res = await client.signAndExecuteTransaction({
    signer: kp, transaction: tx, options: { showEffects: true, showBalanceChanges: true },
  });
  const url = EXPLORER.tx(res.digest);
  const status = res.effects?.status?.status;
  console.log("executed:", url, "\nstatus:", status);
  console.log("balanceChanges:", JSON.stringify(res.balanceChanges ?? [], null, 2));

  mkdirSync("submission", { recursive: true });
  const proof = `# RefiRail — On-chain Proof: PARTIAL refinance Navi -> ${DEST}

A real, atomic **partial** refinance on Sui mainnet: ${Math.round(FRACTION * 100)}% of a live Navi loan
moved to ${DEST} in ONE PTB (DeepBook flash + Navi repay/withdraw + ${DEST} deposit/borrow, oracle-refreshed),
leaving the remainder on Navi at the same loan-to-value. Reverts atomically if any leg fails.

- **Digest:** \`${res.digest}\`
- **Suiscan:** [${res.digest}](${url})
- **Status:** \`${status}\`
- **Sender:** \`${sender}\`
- **Moved:** ${Math.round(FRACTION * 100)}% of (${collatHuman} SUI collateral / ${debtHuman} USDC debt) Navi -> ${DEST}
`;
  writeFileSync(`submission/proof-partial-${DEST}.md`, proof);
  console.log(`\nproof -> submission/proof-partial-${DEST}.md`);
  process.exit(status === "success" ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
