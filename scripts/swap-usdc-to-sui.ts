// File: scripts/swap-usdc-to-sui.ts
// One-off: convert demo-wallet USDC → SUI via the fee-free DeepBook two-hop (USDC→DEEP→SUI) to fund
// a larger SUI-collateral demo position. dryRun-gated before signing (real funds). Whitelisted pairs
// (DEEP_USDC + DEEP_SUI) → 0 DEEP fee. Amount kept modest so less of the user's USDC round-trips.
require("dotenv").config({ path: ".env.local" });

import { Transaction } from "@mysten/sui/transactions";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { makeDeepBook } from "../lib/protocols/deepbook";
import { simulateRefinance } from "../lib/simulate";
import { COINS } from "../lib/config";

const USDC_IN = Number(process.env.SWAP_USDC ?? 14); // swap 14 of ~20; keep ~6 USDC buffer
const SLIPPAGE = 0.03; // 3% floor protection on SUI out

async function retry<T>(fn: () => Promise<T>, n = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try { return await fn(); } catch (e) { last = e; if (i < n - 1) await new Promise((r) => setTimeout(r, 1200)); }
  }
  throw last;
}

async function main() {
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();
  const db = makeDeepBook(client, sender);
  console.log(`\nswap USDC→SUI · sender ${sender}\n`);

  const all = await (client as any).getAllBalances({ owner: sender });
  const usdcBal = Number(all.find((b: any) => b.coinType === COINS.USDC)?.totalBalance ?? 0) / 1e6;
  console.log(`  USDC balance: ${usdcBal.toFixed(6)}  · swapping ${USDC_IN}`);
  if (usdcBal < USDC_IN) { console.log("  insufficient USDC — aborting."); process.exit(1); }

  // Quote USDC→DEEP→SUI for minOut protection.
  const h1 = await retry(() => db.getQuantityOut("DEEP_USDC", 0, USDC_IN)); // sell USDC(quote) → DEEP(base)
  const h2 = await retry(() => db.getQuantityOut("DEEP_SUI", h1.baseOut, 0)); // sell DEEP(base) → SUI(quote)
  const expectedSui = h2.quoteOut;
  const minSui = +(expectedSui * (1 - SLIPPAGE)).toFixed(6);
  console.log(`  quote: ${USDC_IN} USDC → ${h1.baseOut} DEEP → ${expectedSui} SUI (minOut ${minSui}, fee ${h1.deepRequired}/${h2.deepRequired})\n`);

  const tx = new Transaction();
  tx.setSender(sender);
  // hop 1: USDC(quote) → DEEP(base). amount mints USDC from wallet via coinWithBalance.
  const [deepOut, usdcRem, deepDust1] = tx.add(
    db.deepBook.swapExactQuoteForBase({ poolKey: "DEEP_USDC", amount: USDC_IN, deepAmount: 0, minOut: 0 }),
  ) as unknown as [any, any, any];
  // hop 2: DEEP(base) → SUI(quote). minOut enforced on the SUI output.
  const [deepRem, suiOut, deepDust2] = tx.add(
    db.deepBook.swapExactBaseForQuote({ poolKey: "DEEP_SUI", amount: 0, deepAmount: 0, minOut: minSui, baseCoin: deepOut }),
  ) as unknown as [any, any, any];
  tx.transferObjects([suiOut, usdcRem, deepDust1, deepRem, deepDust2], sender);

  const sim = await retry(() => simulateRefinance(client, tx, sender));
  console.log(`  pre-execute dryRun ok=${sim.ok}${sim.ok ? "" : "  abort=" + sim.abortReason}`);
  if (!sim.ok) { console.log("\n❌ dryRun failed — NOT signing."); process.exit(1); }

  const res = await client.signAndExecuteTransaction({
    signer: kp,
    transaction: tx,
    options: { showEffects: true, showBalanceChanges: true },
  });
  console.log(`\n✅ executed · digest ${res.digest}`);
  console.log(`   https://suiscan.xyz/mainnet/tx/${res.digest}`);
  const bc = (res as any).balanceChanges ?? [];
  console.log("   balanceChanges:", bc.map((b: any) => `${String(b.coinType).split("::").pop()}:${b.amount}`).join("  "));
}

main().catch((e) => { console.error("SWAP FAILED:", e); process.exit(1); });
