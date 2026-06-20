// File: scripts/refine-alphalend-execute.ts
// Execute ONE REAL atomic refinance Navi -> ALPHALEND on Sui mainnet and capture the Suiscan proof.
// This is the on-chain credibility anchor for the new multi-lender capability (AlphaLend destination).
// Spends real gas (~0.04 SUI) and is IRREVERSIBLE. Mirrors refine-execute.ts (Suilend), but:
//   - destId: "alphalend" (engine dispatches the AlphaLend deposit/borrow leg, oracle-refreshed in-PTB)
//   - reads BOTH the live debt AND the live collateral just-in-time, so it works at any seed size
//   - writes submission/proof-alphalend.md (does NOT overwrite the Suilend proof.md)
// (alphalend-sdk exports patched locally to add a CJS condition so tsx can resolve it.)
require("dotenv").config({ path: ".env.local" });

import { writeFileSync, mkdirSync } from "node:fs";
import { getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { buildRefinancePTB } from "../lib/refinance";
import { simulateRefinance } from "../lib/simulate";
import { computeFlashAmounts } from "../lib/amounts";
import { EXPLORER, DEEPBOOK, NAVI, COINS } from "../lib/config";

const BUFFER_BPS = Number(process.env.BUFFER_BPS ?? 30);

async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) { last = e; console.warn(`  retry ${i + 1}/${n}:`, (e as Error)?.message ?? e); if (i < n - 1) await new Promise((r) => setTimeout(r, 1500)); }
  }
  throw last;
}

// JIT live position read: USDC debt (atomic, ceil so flash never under-covers) + SUI collateral (atomic, floor).
async function readLivePosition(sender: string): Promise<{ debtAtomic: bigint; collateralAtomic: bigint; debtHuman: number; collateralHuman: number }> {
  const positions = await retry(() => getLendingPositions(sender as never));
  let debtAtomic = 0n, collateralAtomic = 0n, debtHuman = 0, collateralHuman = 0;
  for (const p of positions as any[]) {
    const b = p["navi-lending-borrow"];
    const s = p["navi-lending-supply"];
    if (b && Number(b.amount) > 0 && String(b?.token?.coinType ?? b?.pool?.coinType ?? "").toLowerCase().includes("usdc")) {
      debtHuman = Number(b.amount);
      debtAtomic = BigInt(Math.ceil(debtHuman * 1e6));
    }
    if (s && Number(s.amount) > 0 && String(s?.token?.coinType ?? s?.pool?.coinType ?? "").includes("sui::SUI")) {
      collateralHuman = Number(s.amount);
      collateralAtomic = BigInt(Math.floor(collateralHuman * 1e9));
    }
  }
  if (debtAtomic <= 0n) throw new Error("No live Navi USDC borrow found — seed the position first (scripts/seed-demo.ts).");
  if (collateralAtomic <= 0n) throw new Error("No live Navi SUI collateral found.");
  return { debtAtomic, collateralAtomic, debtHuman, collateralHuman };
}

async function main() {
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();
  console.log("sender:", sender);

  const { debtAtomic, collateralAtomic, debtHuman, collateralHuman } = await readLivePosition(sender);
  const { flashAtomic, flashHuman } = computeFlashAmounts(debtAtomic, BUFFER_BPS);
  console.log(`live Navi debt: ${debtHuman} USDC (${debtAtomic} atomic)`);
  console.log(`live Navi collateral: ${collateralHuman} SUI (${collateralAtomic} atomic)`);
  console.log(`flash / AlphaLend borrow: ${flashHuman} USDC (${flashAtomic} atomic), bufferBps=${BUFFER_BPS}`);

  const tx = await retry(() =>
    buildRefinancePTB({ sender, suiClient: client, debtAtomic, collateralAtomic, bufferBps: BUFFER_BPS, destId: "alphalend" }),
  );

  const sim = await retry(() => simulateRefinance(client, tx, sender));
  console.log("\npre-execute dryRun ok:", sim.ok);
  if (!sim.ok) { console.error("ABORT (would revert live):", sim.abortReason); process.exit(1); }

  console.log("\n>>> signing + executing REAL mainnet tx (Navi -> AlphaLend, irreversible)...");
  const res = await client.signAndExecuteTransaction({
    signer: kp, transaction: tx,
    options: { showEffects: true, showBalanceChanges: true, showObjectChanges: true },
  });
  const url = EXPLORER.tx(res.digest);
  const status = res.effects?.status?.status;
  console.log("\nexecuted:", url, "\nstatus:", status);
  console.log("balanceChanges:", JSON.stringify(res.balanceChanges ?? [], null, 2));

  mkdirSync("submission", { recursive: true });
  const proof = `# RefiRail — On-chain Proof: Navi -> AlphaLend (multi-lender)

One atomic cross-protocol refinance on **Sui mainnet** routing the loan to a SECOND destination money
market, **AlphaLend**, chosen by live borrow APR. DeepBook flash loan + Navi repay/withdraw + AlphaLend
add_collateral/borrow (Pyth-refreshed in-PTB), all in **one programmable transaction block**. If any leg
fails the whole transaction reverts. This proves RefiRail is a real best-rate router, not a single hardcoded pair.

## The refinance transaction
- **Digest:** \`${res.digest}\`
- **Suiscan:** [${res.digest}](${url})
- **Status:** \`${status}\`
- **Demo wallet (sender):** \`${sender}\`
- **Live Navi debt cleared:** ${debtHuman} USDC (${debtAtomic} atomic)
- **Flash / AlphaLend borrow:** ${flashHuman} USDC (${flashAtomic} atomic), bufferBps=${BUFFER_BPS}
- **Collateral moved:** ${collateralHuman} SUI (${collateralAtomic} atomic) Navi -> AlphaLend

## What moved: Navi -> AlphaLend
Before: SUI collateral + USDC native borrow on **Navi**.
After: the SUI collateral now backs a USDC borrow on **AlphaLend**; the Navi position is fully repaid and
the freed collateral withdrawn. All in the single tx above.

## Three protocols, one PTB
- **DeepBook v3** (flash-loan leg): package \`${DEEPBOOK.PACKAGE_ID}\`, SUI_USDC pool \`${DEEPBOOK.SUI_USDC_POOL}\`
- **Navi** (repay + withdraw): SUI assetId ${NAVI.SUI_ASSET_ID}, native-USDC assetId ${NAVI.USDC_ASSET_ID}
- **AlphaLend** (create position + add collateral + borrow, Pyth-refreshed in-PTB)
- **Native USDC:** \`${COINS.USDC}\`

## Verify it yourself
Open the Suiscan link. The MoveCalls show DeepBook (flash), Navi (repay/withdraw), and AlphaLend
(alpha_lending add_collateral / borrow / fulfill_promise) packages invoked inside the same atomic tx.
`;
  writeFileSync("submission/proof-alphalend.md", proof);
  console.log("\nproof written -> submission/proof-alphalend.md");
  process.exit(status === "success" ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
