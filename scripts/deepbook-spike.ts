// File: scripts/deepbook-spike.ts
// GATING SPIKE (DEEPBOOK-DELIBERATION-BRIEF.md §4): decide the submission track on a TESTED fact.
// Question: can a FEE-FREE SUI->DEEP->USDC two-hop through DeepBook's WHITELISTED pools
//   (a) clear with usable liquidity / acceptable slippage for demo-size amounts, and
//   (b) compose inside our atomic PTB alongside the DeepBook flash loan?
// GREEN => DeepBook-core widening is feasible. RED => keep the proven core, go DeFi & Payments.
//
// 100% FREE: read-only getQuantityOut/midPrice/whitelisted (devInspect) + dryRun (spends nothing).
// Pattern mirrors scripts/refine-dryrun.ts (dotenv .env.local, makeSuiClient, dryRunTransactionBlock).
require("dotenv").config({ path: ".env.local" });

import { Transaction } from "@mysten/sui/transactions";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { makeDeepBook } from "../lib/protocols/deepbook";
import { simulateRefinance } from "../lib/simulate";

// Pool keys are the SDK's own mainnet identifiers (node_modules/@mysten/deepbook-v3 constants).
const DEEP_SUI = "DEEP_SUI"; // base=DEEP quote=SUI   (whitelisted candidate)
const DEEP_USDC = "DEEP_USDC"; // base=DEEP quote=USDC (whitelisted candidate)
const SUI_USDC = "SUI_USDC"; // base=SUI  quote=USDC  (the current flash pool; non-whitelisted for swaps)

// Demo-scale SUI inputs to probe depth: dust(demo) -> small -> mid.
const SUI_SIZES = [0.1, 0.3, 0.5, 1, 3, 10];

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
  console.log(`\nRefiRail · DeepBook routing spike\nsender ${sender}\n`);

  // ── PART 1: whitelist + fee status (the fee blocker / unlock) ──────────────
  console.log("── 1. Pool whitelist + spot (fee-free swap requires whitelisted) ──");
  const pools = [DEEP_SUI, DEEP_USDC, SUI_USDC];
  const wl: Record<string, boolean> = {};
  for (const p of pools) {
    const w = await retry(() => db.whitelisted(p));
    const mid = await retry(() => db.midPrice(p)).catch(() => NaN);
    wl[p] = w;
    console.log(`  ${p.padEnd(10)} whitelisted=${String(w).padEnd(5)} mid=${mid}`);
  }
  // SUI/USD spot from the SUI_USDC mid (quote USDC per base SUI).
  const suiUsd = await retry(() => db.midPrice(SUI_USDC));
  console.log(`  → SUI spot ≈ $${suiUsd.toFixed(4)} (from SUI_USDC mid)\n`);

  // ── PART 2: liquidity / slippage of the fee-free two-hop vs the direct pool ─
  console.log("── 2. Quote: SUI→DEEP→USDC (two whitelisted hops) vs direct SUI→USDC ──");
  console.log("  size(SUI)   2hop USDC   eff$/SUI   slip%    DEEPfee(h1/h2)   direct USDC  directDEEPfee");
  for (const sui of SUI_SIZES) {
    try {
      // hop 1: sell SUI (quote of DEEP_SUI) -> DEEP (base).  baseQ=0, quoteQ=suiIn
      const h1 = await retry(() => db.getQuantityOut(DEEP_SUI, 0, sui));
      const deepOut = h1.baseOut;
      // hop 2: sell DEEP (base of DEEP_USDC) -> USDC (quote).  baseQ=deepOut, quoteQ=0
      const h2 = await retry(() => db.getQuantityOut(DEEP_USDC, deepOut, 0));
      const usdc2 = h2.quoteOut;
      // direct: sell SUI (base of SUI_USDC) -> USDC (quote). baseQ=suiIn, quoteQ=0
      const d = await retry(() => db.getQuantityOut(SUI_USDC, sui, 0));
      const spot = sui * suiUsd;
      const eff = usdc2 / sui;
      const slip = ((spot - usdc2) / spot) * 100;
      console.log(
        `  ${String(sui).padEnd(11)} ${usdc2.toFixed(4).padEnd(11)} ${eff
          .toFixed(4)
          .padEnd(10)} ${slip.toFixed(2).padEnd(8)} ${(h1.deepRequired + "/" + h2.deepRequired).padEnd(
          16,
        )} ${d.quoteOut.toFixed(4).padEnd(12)} ${d.deepRequired}`,
      );
    } catch (e) {
      console.log(`  ${String(sui).padEnd(11)} ERR ${(e as Error).message.slice(0, 80)}`);
    }
  }

  // ── PART 3: does the fee-free two-hop COMPOSE in a single atomic PTB? ───────
  // 3a. standalone two-hop swap, real coins minted from wallet, dryRun.
  console.log("\n── 3a. Atomic compose: standalone SUI→DEEP→USDC two-hop (dryRun) ──");
  {
    const SUI_IN = 0.5;
    const tx = new Transaction();
    tx.setSender(sender);
    // hop1: SUI(quote)->DEEP(base). No quoteCoin passed => SDK mints SUI via coinWithBalance (wallet).
    const [deepOut, suiRem, deepRem1] = tx.add(
      db.deepBook.swapExactQuoteForBase({ poolKey: DEEP_SUI, amount: SUI_IN, deepAmount: 0, minOut: 0 }),
    ) as unknown as [any, any, any];
    // hop2: DEEP(base)->USDC(quote). Feed the DEEP from hop1 as baseCoin.
    const [deepRem2, usdcOut, deepRem3] = tx.add(
      db.deepBook.swapExactBaseForQuote({
        poolKey: DEEP_USDC,
        amount: 0,
        deepAmount: 0,
        minOut: 0,
        baseCoin: deepOut,
      }),
    ) as unknown as [any, any, any];
    tx.transferObjects([usdcOut, suiRem, deepRem1, deepRem2, deepRem3], sender);
    const r = await simulateRefinance(suiClient, tx, sender);
    console.log(`  twoHop dryRun ok=${r.ok}${r.ok ? "" : "  abort=" + r.abortReason}`);
    if (r.ok)
      console.log(
        "  balanceChanges:",
        r.balanceChanges.map((b) => `${b.coinType.split("::").pop()}:${b.amount}`).join("  "),
      );
  }

  // 3b. the REAL product shape: flash-borrow USDC (fee-free) + two-hop swap + return flash, all atomic.
  console.log("\n── 3b. Atomic compose: flash-borrow USDC + two-hop swap + return flash (dryRun) ──");
  {
    const SUI_IN = 0.5;
    const FLASH_USDC = 0.1; // tiny fee-free flash, returned exactly
    const tx = new Transaction();
    tx.setSender(sender);
    // flash borrow USDC (hot potato) from SUI_USDC
    const [flashUsdc, flashLoan] = tx.add(
      db.flashLoans.borrowQuoteAsset(SUI_USDC, FLASH_USDC),
    ) as unknown as [any, any];
    // two-hop swap (independent of the flash coin) in the SAME tx
    const [deepOut, suiRem, deepRem1] = tx.add(
      db.deepBook.swapExactQuoteForBase({ poolKey: DEEP_SUI, amount: SUI_IN, deepAmount: 0, minOut: 0 }),
    ) as unknown as [any, any, any];
    const [deepRem2, usdcOut, deepRem3] = tx.add(
      db.deepBook.swapExactBaseForQuote({
        poolKey: DEEP_USDC,
        amount: 0,
        deepAmount: 0,
        minOut: 0,
        baseCoin: deepOut,
      }),
    ) as unknown as [any, any, any];
    // return the flash EXACTLY from the borrowed coin (self-splits); remainder back to us
    const flashRem = tx.add(
      db.flashLoans.returnQuoteAsset(SUI_USDC, FLASH_USDC, flashUsdc, flashLoan),
    ) as unknown as any;
    tx.transferObjects([usdcOut, suiRem, deepRem1, deepRem2, deepRem3, flashRem], sender);
    const r = await simulateRefinance(suiClient, tx, sender);
    console.log(`  flash+swap dryRun ok=${r.ok}${r.ok ? "" : "  abort=" + r.abortReason}`);
    if (r.ok)
      console.log(
        "  balanceChanges:",
        r.balanceChanges.map((b) => `${b.coinType.split("::").pop()}:${b.amount}`).join("  "),
      );
  }

  console.log("\n── VERDICT INPUTS ──");
  console.log(`  DEEP_SUI whitelisted:  ${wl[DEEP_SUI]}`);
  console.log(`  DEEP_USDC whitelisted: ${wl[DEEP_USDC]}`);
  console.log(`  SUI_USDC whitelisted:  ${wl[SUI_USDC]}  (direct-swap fee blocker if false)`);
  console.log("  → GREEN if: both DEEP pairs whitelisted + 0 DEEP fee + 3a/3b dryRun ok + slippage sane.\n");
}

main().catch((e) => {
  console.error("SPIKE FAILED:", e);
  process.exit(1);
});
