// File: scripts/deleverage-dryrun.ts
// Prove the DeepBook-powered deleverage PTB dry-runs GREEN on live mainnet for $0 (the riskiest
// unknown of the widening). dryRun spends nothing. Mirrors scripts/refine-dryrun.ts.
//   Path: DeepBook flash USDC → Navi oracle refresh → repay Navi slice → withdraw SUI slice →
//         fee-free two-hop SUI→DEEP→USDC → return flash → sweep surplus.
require("dotenv").config({ path: ".env.local" });

import { getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { makeDeepBook } from "../lib/protocols/deepbook";
import { buildDeleveragePTB } from "../lib/deleverage";
import { sizeDeleverage } from "../lib/deleverageQuote";
import { simulateRefinance } from "../lib/simulate";

// Real quote-based sizing (lib/deleverageQuote): the SUI slice is derived from a live DeepBook quote
// and clamped to the two-hop floor. On a tiny demo debt this clamps to MIN_SUI_SELL (surplus swept back).
const REPAY_FRACTION = 0.5; // pay down 50% of the USDC debt

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
  const db = makeDeepBook(suiClient, sender);
  console.log(`\nRefiRail · deleverage dry-run\nsender ${sender}\n`);

  // Read the live Navi USDC debt + SUI collateral just-in-time (never fabricate amounts).
  const positions = await retry(() => getLendingPositions(sender));
  let debtHuman = 0, collatSui = 0;
  for (const p of positions as any[]) {
    const b = p?.["navi-lending-borrow"];
    const s = p?.["navi-lending-supply"];
    if (b && String(b?.token?.coinType ?? "").toLowerCase().includes("usdc") && Number(b.amount) > 0) {
      const dec = Number(b?.token?.decimals ?? 6); const a = Number(b.amount);
      debtHuman = a > 1e6 && dec >= 6 ? a / 10 ** dec : a;
    }
    if (s && String(s?.token?.coinType ?? "").includes("sui::SUI") && Number(s.amount) > 0) {
      const dec = Number(s?.token?.decimals ?? 9); const a = Number(s.amount);
      collatSui = a > 1e6 && dec >= 6 ? a / 10 ** dec : a;
    }
  }
  if (debtHuman <= 0) {
    console.log("No Navi USDC debt found — seed the demo position first (npm run seed). Aborting.");
    process.exit(1);
  }

  const debtAtomic = BigInt(Math.round(debtHuman * 1e6));
  const size = await retry(() => sizeDeleverage(db, debtAtomic, REPAY_FRACTION, collatSui));
  if (!size.ok) { console.log(`sizing failed: ${size.reason}`); process.exit(1); }
  console.log(
    `live debt ≈ ${debtHuman.toFixed(6)} USDC · collat ${collatSui.toFixed(4)} SUI\n` +
    `sized: repay ${size.repayHuman.toFixed(6)} USDC (${REPAY_FRACTION * 100}%) by selling ${size.suiToSell} SUI ` +
    `(@ $${size.effPricePerSui.toFixed(4)}/SUI → ~${size.quotedUsdcOut.toFixed(4)} USDC out)\n`,
  );

  const tx = await retry(() =>
    buildDeleveragePTB({ sender, suiClient, repayAtomic: size.repayAtomic, collateralAtomic: size.collateralAtomic }),
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
