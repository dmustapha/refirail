// File: scripts/refine-execute.ts
// Task 2.2 (F-001, the credibility anchor): execute ONE REAL cross-protocol atomic refinance on
// Sui mainnet and capture the Suiscan proof. This spends real gas (~0.04 SUI) and is IRREVERSIBLE.
//
// Derived from ARCHITECTURE.md §14 (signAndExecuteTransaction + submission/proof.md), but adapted
// to the REAL position the same way refine-dryrun.ts is:
//   - The §14 sketch hardcodes usdcAtomic(1)/suiAtomic(3). Reality is a 1.0 SUI collateral /
//     ~0.3009-and-accruing USDC debt position (opened Task 1.6). Per the binding rules, the debt is
//     read JUST-IN-TIME from the live Navi position right before build so the flash fully clears it.
//   - A FINAL pre-execute dry-run runs first; if it is not ok:true we abort BEFORE signing (no gas
//     wasted on a known-bad PTB). This is the §14 "dryRun before signing" gate, in-script.
//   - gRPC (Suilend init) intermittently throws "RpcError: fetch failed" -> retry up to 3x.
//   - proof.md is written per §16 (digest + Suiscan URL + demo address + protocol object ids).
require("dotenv").config({ path: ".env.local" });

import { writeFileSync, mkdirSync } from "node:fs";
import { getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { buildRefinancePTB } from "../lib/refinance";
import { simulateRefinance } from "../lib/simulate";
import { computeFlashAmounts, suiAtomic, usdcHuman } from "../lib/amounts";
import { EXPLORER, SUILEND, DEEPBOOK, NAVI, COINS } from "../lib/config";

const COLLATERAL_SUI = 1.0; // matches the Task 1.6 position (1.0 SUI Navi collateral)
const BUFFER_BPS = Number(process.env.BUFFER_BPS ?? 30); // flash over-borrow buffer

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

// JUST-IN-TIME live debt read (same as refine-dryrun.ts). Navi SDK returns the borrow as a
// HUMAN-units string; convert to atomic (6 dp), rounding UP so the flash never under-covers.
async function readLiveDebtAtomic(sender: string): Promise<bigint> {
  const positions = await retry(() => getLendingPositions(sender as never));
  for (const p of positions) {
    const b: any = p["navi-lending-borrow"];
    const coinType = String(b?.pool?.coinType ?? b?.token?.coinType ?? "");
    if (b && Number(b.amount) > 0 && coinType.toLowerCase().includes("usdc")) {
      return BigInt(Math.ceil(Number(b.amount) * 10 ** 6));
    }
  }
  throw new Error("No live Navi USDC borrow found — open the position first (scripts/open-position.ts).");
}

async function main() {
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();
  console.log("sender:", sender);

  // 1. live debt (just-in-time)
  const debtAtomic = await readLiveDebtAtomic(sender);
  const { flashAtomic, flashHuman } = computeFlashAmounts(debtAtomic, BUFFER_BPS);
  console.log(`live Navi debt: ${usdcHuman(debtAtomic)} USDC (${debtAtomic} atomic)`);
  console.log(`bufferBps: ${BUFFER_BPS}`);
  console.log(`flash / Suilend borrow: ${flashHuman} USDC (${flashAtomic} atomic)`);
  console.log(`collateral to move: ${COLLATERAL_SUI} SUI (${suiAtomic(COLLATERAL_SUI)} atomic)`);

  // 2. compose the hero PTB (Suilend init does gRPC inside -> retry)
  const tx = await retry(() =>
    buildRefinancePTB({
      sender,
      suiClient: client,
      debtAtomic,
      collateralAtomic: suiAtomic(COLLATERAL_SUI),
      bufferBps: BUFFER_BPS,
    }),
  );

  // 3. FINAL pre-execute dry-run gate ($0). Abort BEFORE signing if not ok — saves gas on a bad PTB.
  // The public fullnode socket intermittently drops ("fetch failed"/UND_ERR_SOCKET) mid tx.build /
  // dryRun (RISK 9) — retry so a flaky socket never crashes us before we even reach the gate.
  const sim = await retry(() => simulateRefinance(client, tx, sender));
  console.log("\npre-execute dryRun ok:", sim.ok);
  if (!sim.ok) {
    console.error("ABORT (would revert live):", sim.abortReason);
    process.exit(1);
  }

  // 4. sign + execute the REAL mainnet tx ONCE. NOT retry-wrapped on purpose: a retry could
  // double-submit if the first attempt landed on-chain but the response was lost. Single shot only.
  console.log("\n>>> signing + executing REAL mainnet tx (irreversible, spends gas)...");
  const res = await client.signAndExecuteTransaction({
    signer: kp,
    transaction: tx,
    options: { showEffects: true, showBalanceChanges: true, showObjectChanges: true },
  });

  const url = EXPLORER.tx(res.digest);
  const status = res.effects?.status?.status;
  console.log("\nexecuted:", url);
  console.log("status:", status);
  console.log("balanceChanges:", JSON.stringify(res.balanceChanges ?? [], null, 2));

  // 5. write the §16 proof (digest + Suiscan URL + demo address + protocol object ids).
  mkdirSync("submission", { recursive: true });
  const proof = `# RefiRail — On-chain Proof (F-001)

One atomic cross-protocol refinance on **Sui mainnet** — DeepBook flash loan + Navi repay/withdraw
+ Suilend deposit/borrow, all in **one programmable transaction block (PTB)**. If any leg fails,
the entire transaction reverts. This single tx is the project's credibility anchor.

## The refinance transaction
- **Digest:** \`${res.digest}\`
- **Suiscan:** [${res.digest}](${url})
- **Status:** \`${status}\`
- **Demo wallet (sender):** \`${sender}\`
- **Live Navi debt cleared:** ${usdcHuman(debtAtomic)} USDC (${debtAtomic} atomic)
- **Flash / Suilend borrow:** ${flashHuman} USDC (${flashAtomic} atomic), bufferBps=${BUFFER_BPS}
- **Collateral moved:** ${COLLATERAL_SUI} SUI (${suiAtomic(COLLATERAL_SUI)} atomic) Navi → Suilend

## What moved: Navi → Suilend
Before: 1.0 SUI collateral + ~${usdcHuman(debtAtomic)} USDC native borrow on **Navi**.
After: the 1.0 SUI collateral now backs a USDC borrow on **Suilend** (Main Pool); the Navi position
is fully repaid and the freed collateral withdrawn. All in the single tx above.

## Three protocols, one PTB — object ids
- **DeepBook v3** (flash-loan leg): package \`${DEEPBOOK.PACKAGE_ID}\`, SUI_USDC pool \`${DEEPBOOK.SUI_USDC_POOL}\`, registry \`${DEEPBOOK.REGISTRY_ID}\`
- **Navi** (repay + withdraw): SUI assetId ${NAVI.SUI_ASSET_ID}, native-USDC assetId ${NAVI.USDC_ASSET_ID}
- **Suilend** (deposit + borrow): Main Pool lending market \`${SUILEND.LENDING_MARKET_ID}\`, type \`${SUILEND.LENDING_MARKET_TYPE}\`
- **Native USDC:** \`${COINS.USDC}\`

## Verify it yourself
Open the Suiscan link above. The transaction's MoveCalls show DeepBook (flash_loan/swap),
Navi (repay/withdraw), and Suilend (deposit/borrow) packages invoked inside the same atomic tx.
`;
  writeFileSync("submission/proof.md", proof);
  console.log("\nproof written -> submission/proof.md");

  process.exit(status === "success" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
