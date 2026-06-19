// File: scripts/deleverage-dryrun.ts
// Prove the DeepBook-powered deleverage PTB dry-runs GREEN on live mainnet for $0 (the riskiest
// unknown of the widening). dryRun spends nothing. Mirrors scripts/refine-dryrun.ts.
//   Path: DeepBook flash USDC → Navi oracle refresh → repay Navi slice → withdraw SUI slice →
//         fee-free two-hop SUI→DEEP→USDC → return flash → sweep surplus.
require("dotenv").config({ path: ".env.local" });

import { getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { buildDeleveragePTB } from "../lib/deleverage";
import { simulateRefinance } from "../lib/simulate";

// Demo position is tiny (~0.30 USDC debt), so the strictly-needed SUI is below the two-hop's ~0.3 SUI
// floor. For the mechanism proof we over-withdraw a safe 0.5 SUI slice (above the floor); the surplus
// USDC is swept back. Real sizing (quote-based, min-floor clamped) lands in the API layer next.
const REPAY_FRACTION = 0.5; // pay down 50% of the USDC debt
const TEST_COLLATERAL_SUI = 0.5; // withdraw + sell this much SUI (above the two-hop floor)

async function retry<T>(fn: () => Promise<T>, n = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < n - 1) await new Promise((r) => setTimeout(r, 1200));
    }
  }
  throw last;
}

async function main() {
  const suiClient = makeSuiClient();
  const sender = makeDemoKeypair().getPublicKey().toSuiAddress();
  console.log(`\nRefiRail · deleverage dry-run\nsender ${sender}\n`);

  // Read the live Navi USDC debt just-in-time (never fabricate amounts).
  const positions = await retry(() => getLendingPositions(sender));
  let debtHuman = 0;
  for (const p of positions as any[]) {
    const b = p?.["navi-lending-borrow"];
    if (b && String(b?.token?.coinType ?? "").toLowerCase().includes("usdc") && Number(b.amount) > 0) {
      const dec = Number(b?.token?.decimals ?? 6);
      const a = Number(b.amount);
      debtHuman = a > 1e6 && dec >= 6 ? a / 10 ** dec : a;
    }
  }
  if (debtHuman <= 0) {
    console.log("No Navi USDC debt found — seed the demo position first (npm run seed). Aborting.");
    process.exit(1);
  }

  const repayAtomic = BigInt(Math.floor(debtHuman * REPAY_FRACTION * 1e6));
  const collateralAtomic = BigInt(Math.floor(TEST_COLLATERAL_SUI * 1e9));
  console.log(
    `live debt ≈ ${debtHuman.toFixed(6)} USDC → repay ${(debtHuman * REPAY_FRACTION).toFixed(
      6,
    )} (${REPAY_FRACTION * 100}%) by selling ${TEST_COLLATERAL_SUI} SUI\n`,
  );

  const tx = await retry(() =>
    buildDeleveragePTB({ sender, suiClient, repayAtomic, collateralAtomic }),
  );
  const sim = await simulateRefinance(suiClient, tx, sender);

  console.log(`deleverage dryRun ok=${sim.ok}${sim.ok ? "" : "  abort=" + sim.abortReason}`);
  if (sim.ok) {
    console.log(
      "balanceChanges:",
      sim.balanceChanges.map((b) => `${b.coinType.split("::").pop()}:${b.amount}`).join("  "),
    );
    console.log("\n✅ GREEN — DeepBook-powered deleverage composes atomically on live mainnet.");
  } else {
    console.log("\n❌ RED — see abort reason above.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("DRY-RUN FAILED:", e);
  process.exit(1);
});
