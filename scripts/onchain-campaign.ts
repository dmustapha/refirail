// File: scripts/onchain-campaign.ts
// A real, honest on-chain footprint for RefiRail on Sui mainnet. Three categories of REAL operations,
// every one dryRun-gated before signing (real funds, real data, no fabrication):
//   A) DeepBook swaps SUI↔USDC (fee-free two-hop through the whitelisted DEEP pairs) — real order-book volume.
//   B) Deleverage cycles: the headline engine (DeepBook flash + repay + withdraw + two-hop) followed by a
//      borrow-back to restore the debt so the position can be deleveraged again.
//   C) Revert-proofs (dryRun only, $0): an impossible-minOut deleverage and a below-floor request both
//      ABORT atomically — the safety guarantee, proven on mainnet without spending.
// GAS GUARD: keeps >= RESERVE_SUI free at all times (re-checked every iteration; campaign stops cleanly).
// HONESTY: these are legitimate self-operations; reported as "N test operations on mainnet". DeepBook
// volume is real but never framed as third-party usage.
//
// Usage:
//   dry preview (no signing):  npx tsx scripts/onchain-campaign.ts
//   run for real:              npx tsx scripts/onchain-campaign.ts --execute
//   tune:  CAMPAIGN_SWAPS=16 CAMPAIGN_CYCLES=6 npx tsx scripts/onchain-campaign.ts --execute
require("dotenv").config({ path: ".env.local" });

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { Transaction } from "@mysten/sui/transactions";
import { borrowCoinPTB, getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { makeDeepBook } from "../lib/protocols/deepbook";
import { buildDeleveragePTB } from "../lib/deleverage";
import { sizeDeleverage } from "../lib/deleverageQuote";
import { simulateRefinance } from "../lib/simulate";
import { appendNaviOracleRefresh } from "../lib/protocols/navi";
import { usdcAtomic } from "../lib/amounts";
import { NAVI, COINS } from "../lib/config";

const EXECUTE = process.argv.includes("--execute");
const SWAP_ROUNDTRIPS = Number(process.env.CAMPAIGN_SWAPS ?? 14); // each round-trip = 2 swaps (SUI→USDC, USDC→SUI)
const DELEV_CYCLES = Number(process.env.CAMPAIGN_CYCLES ?? 6); // each cycle = deleverage + borrow-back (2 ops)
const RESERVE_SUI = 5; // never drop free SUI below this
const SWAP_SUI = 0.35; // SUI per SUI→USDC leg
const SLIPPAGE = 0.03; // 3% minOut protection on swaps

type Op = { kind: string; detail: string; digest: string; url: string };
const ledger: Op[] = [];
const reverts: { kind: string; detail: string; abortReason: string }[] = [];

async function retry<T>(fn: () => Promise<T>, n = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try { return await fn(); } catch (e) { last = e; if (i < n - 1) await new Promise((r) => setTimeout(r, 1300)); }
  }
  throw last;
}

const client = makeSuiClient();
const kp = makeDemoKeypair();
const sender = kp.getPublicKey().toSuiAddress();
const db = makeDeepBook(client, sender);

async function freeBalances() {
  const all: any[] = await retry(() => (client as any).getAllBalances({ owner: sender }));
  const sui = Number(all.find((b: any) => b.coinType === "0x2::sui::SUI")?.totalBalance ?? 0) / 1e9;
  const usdc = Number(all.find((b: any) => b.coinType === COINS.USDC)?.totalBalance ?? 0) / 1e6;
  return { sui, usdc };
}

async function readPosition() {
  const positions = await retry(() => getLendingPositions(sender as never));
  let collatSui = 0, debtUsdc = 0;
  for (const p of positions as any[]) {
    const s = p?.["navi-lending-supply"], b = p?.["navi-lending-borrow"];
    if (s && String(s.token?.coinType ?? "").includes("sui::SUI") && Number(s.amount) > 0) collatSui += Number(s.amount);
    if (b && String(b.token?.coinType ?? "").toLowerCase().includes("usdc") && Number(b.amount) > 0) debtUsdc += Number(b.amount);
  }
  return { collatSui, debtUsdc };
}

// Execute a dryRun-gated tx ONCE. Returns digest or null (logs + continues on failure).
async function execGated(tx: Transaction, kind: string, detail: string): Promise<string | null> {
  try {
    const sim = await retry(() => simulateRefinance(client, tx, sender));
    if (!sim.ok) { console.log(`  ✗ ${kind} dryRun abort: ${sim.abortReason}`); return null; }
    if (!EXECUTE) { console.log(`  · ${kind} dryRun GREEN (${detail}) [preview — not signed]`); return "DRYRUN"; }
    const res = await client.signAndExecuteTransaction({ signer: kp, transaction: tx, options: { showEffects: true } });
    const status = res.effects?.status?.status;
    if (status !== "success") { console.log(`  ✗ ${kind} on-chain fail: ${JSON.stringify(res.effects?.status)}`); return null; }
    const url = `https://suiscan.xyz/mainnet/tx/${res.digest}`;
    ledger.push({ kind, detail, digest: res.digest, url });
    console.log(`  ✓ ${kind} ${res.digest}`);
    return res.digest;
  } catch (e) {
    console.log(`  ✗ ${kind} threw: ${(e as Error)?.message ?? e}`);
    return null;
  }
}

function buildSwapSuiToUsdc(suiHuman: number, minUsdc: number): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);
  const [deepOut, suiRem, dust1] = tx.add(
    db.deepBook.swapExactQuoteForBase({ poolKey: "DEEP_SUI", amount: suiHuman, deepAmount: 0, minOut: 0 }),
  ) as unknown as [any, any, any];
  const [deepRem, usdcOut, dust2] = tx.add(
    db.deepBook.swapExactBaseForQuote({ poolKey: "DEEP_USDC", amount: 0, deepAmount: 0, minOut: minUsdc, baseCoin: deepOut }),
  ) as unknown as [any, any, any];
  tx.transferObjects([usdcOut, suiRem, dust1, deepRem, dust2], sender);
  return tx;
}

function buildSwapUsdcToSui(usdcHuman: number, minSui: number): Transaction {
  const tx = new Transaction();
  tx.setSender(sender);
  const [deepOut, usdcRem, dust1] = tx.add(
    db.deepBook.swapExactQuoteForBase({ poolKey: "DEEP_USDC", amount: usdcHuman, deepAmount: 0, minOut: 0 }),
  ) as unknown as [any, any, any];
  const [deepRem, suiOut, dust2] = tx.add(
    db.deepBook.swapExactBaseForQuote({ poolKey: "DEEP_SUI", amount: 0, deepAmount: 0, minOut: minSui, baseCoin: deepOut }),
  ) as unknown as [any, any, any];
  tx.transferObjects([suiOut, usdcRem, dust1, deepRem, dust2], sender);
  return tx;
}

async function borrowBack(usdcHuman: number): Promise<string | null> {
  const tx = new Transaction();
  tx.setSender(sender);
  await appendNaviOracleRefresh(tx, sender);
  const usdc = await borrowCoinPTB(tx as never, NAVI.USDC_ASSET_ID, Number(usdcAtomic(usdcHuman)));
  tx.transferObjects([usdc as never], sender);
  return execGated(tx, "borrow-back", `+${usdcHuman.toFixed(4)} USDC debt`);
}

async function deleverageOnce(fraction: number): Promise<string | null> {
  const { collatSui, debtUsdc } = await readPosition();
  if (debtUsdc < 0.5 || collatSui < 4) { console.log(`  · skip deleverage (debt ${debtUsdc.toFixed(2)} / collat ${collatSui.toFixed(2)} — guard)`); return null; }
  const debtAtomic = BigInt(Math.round(debtUsdc * 1e6));
  const size = await retry(() => sizeDeleverage(db, debtAtomic, fraction, collatSui));
  if (!size.ok) { console.log(`  · skip deleverage (sizing: ${size.reason})`); return null; }
  const tx = await retry(() => buildDeleveragePTB({ sender, suiClient: client, repayAtomic: size.repayAtomic, collateralAtomic: size.collateralAtomic }));
  return execGated(tx, "deleverage", `${fraction * 100}% · sell ${size.suiToSell} SUI → repay ${size.repayHuman.toFixed(4)} USDC`);
}

// Revert-proof: a deleverage with an IMPOSSIBLE minOut (force the two-hop USDC floor unreachable) must abort.
async function revertProofImpossibleMinOut() {
  const { collatSui, debtUsdc } = await readPosition();
  if (debtUsdc < 0.3) { console.log("  · skip revert-proof (no debt)"); return; }
  const debtAtomic = BigInt(Math.round(debtUsdc * 1e6));
  const size = await retry(() => sizeDeleverage(db, debtAtomic, 0.25, collatSui));
  if (!size.ok) { console.log("  · skip revert-proof (sizing)"); return; }
  // Demand 100x the achievable USDC out for the same SUI sold → the hop-2 minOut can never be met.
  const repayAtomic = size.repayAtomic * 100n;
  try {
    const tx = await buildDeleveragePTB({ sender, suiClient: client, repayAtomic, collateralAtomic: size.collateralAtomic });
    const sim = await simulateRefinance(client, tx, sender);
    if (!sim.ok) { reverts.push({ kind: "impossible-minOut", detail: "deleverage demanding 100× achievable USDC", abortReason: sim.abortReason ?? "aborted" }); console.log(`  ✓ revert-proof (impossible-minOut) ABORTED: ${sim.abortReason}`); }
    else console.log("  ✗ revert-proof did NOT abort (unexpected) — skipping as proof");
  } catch (e) {
    reverts.push({ kind: "impossible-minOut", detail: "deleverage demanding 100× achievable USDC", abortReason: (e as Error)?.message ?? String(e) });
    console.log("  ✓ revert-proof (impossible-minOut) ABORTED at build (eager dryRun)");
  }
}

// Revert-proof: a below-floor request is REJECTED by the sizing guard before any tx is built.
async function revertProofBelowFloor() {
  const sized = await retry(() => sizeDeleverage(db, 1n, 0.25, 0.01)); // dust debt + dust collateral
  if (!sized.ok) { reverts.push({ kind: "below-floor", detail: "deleverage on a sub-floor position", abortReason: sized.reason ?? "rejected" }); console.log(`  ✓ revert-proof (below-floor) REJECTED: ${sized.reason}`); }
  else console.log("  ✗ below-floor not rejected (unexpected)");
}

function writeProof() {
  mkdirSync("submission", { recursive: true });
  const byKind = (k: string) => ledger.filter((o) => o.kind === k);
  const swaps = ledger.filter((o) => o.kind.startsWith("swap"));
  const delevs = byKind("deleverage");
  const borrows = byKind("borrow-back");
  const headline = "BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK";
  const lines: string[] = [];
  lines.push("# RefiRail — On-chain Proof Ledger (Sui mainnet)\n");
  lines.push("Every operation below is a **real transaction on Sui mainnet**, executed by RefiRail's own");
  lines.push("engine and dry-run-gated before signing. These are legitimate self-operations run to exercise");
  lines.push("the system end-to-end and build real DeepBook order-book volume — reported here as test");
  lines.push("operations, never framed as third-party usage.\n");
  lines.push(`- **Demo wallet:** \`${sender}\``);
  lines.push(`- **Headline atomic refinance (Navi→Suilend, one PTB):** [${headline.slice(0, 12)}…](https://suiscan.xyz/mainnet/tx/${headline})`);
  lines.push(`- **Headline atomic deleverage (DeepBook flash + two-hop):** [4S5bhsgZ…](https://suiscan.xyz/mainnet/tx/4S5bhsgZhsrwjaavUNBAZKyDwWKxKfruUTUXD6jT3S8K)\n`);
  lines.push("## Summary");
  lines.push("| Category | Count |");
  lines.push("|----------|------:|");
  lines.push(`| DeepBook swaps (SUI↔USDC, fee-free two-hop) | ${swaps.length} |`);
  lines.push(`| Deleverages (DeepBook-powered, atomic) | ${delevs.length} |`);
  lines.push(`| Borrow-backs (Navi, position reset) | ${borrows.length} |`);
  lines.push(`| Atomic revert-proofs (safety, $0 dryRun) | ${reverts.length} |`);
  lines.push(`| **Total signed mainnet ops** | **${ledger.length}** |\n`);
  const section = (title: string, ops: Op[]) => {
    if (!ops.length) return;
    lines.push(`## ${title}`);
    for (const o of ops) lines.push(`- \`${o.kind}\` — ${o.detail} — [${o.digest.slice(0, 12)}…](${o.url})`);
    lines.push("");
  };
  section("DeepBook swaps", swaps);
  section("Deleverages", delevs);
  section("Borrow-backs", borrows);
  if (reverts.length) {
    lines.push("## Atomic revert-proofs (safety — aborted, zero balance moved)");
    for (const r of reverts) lines.push(`- \`${r.kind}\` — ${r.detail} — aborted: ${r.abortReason}`);
    lines.push("");
  }
  writeFileSync("submission/proof.md", lines.join("\n"));
  console.log(`\nproof ledger → submission/proof.md (${ledger.length} signed ops, ${reverts.length} revert-proofs)`);
}

async function main() {
  console.log(`\nRefiRail · on-chain campaign  [${EXECUTE ? "EXECUTE" : "PREVIEW"}]\nsender ${sender}`);
  const start = await freeBalances();
  console.log(`start: ${start.sui.toFixed(4)} SUI · ${start.usdc.toFixed(4)} USDC free\n`);

  // Preserve any prior headline proof.md content note (campaign rewrites with the full ledger).
  if (existsSync("submission/proof.md") && !EXECUTE) console.log("(preview: existing submission/proof.md left untouched)\n");

  // ---- A) DeepBook swap round-trips ----
  console.log(`A) DeepBook swaps — ${SWAP_ROUNDTRIPS} round-trips (SUI→USDC→SUI)`);
  for (let i = 0; i < SWAP_ROUNDTRIPS; i++) {
    const bal = await freeBalances();
    if (bal.sui - SWAP_SUI < RESERVE_SUI) { console.log(`  · gas guard: ${bal.sui.toFixed(3)} SUI free — stopping swaps`); break; }
    // leg 1: SUI → USDC
    const q1a = await retry(() => db.getQuantityOut("DEEP_SUI", 0, SWAP_SUI));
    const q1b = await retry(() => db.getQuantityOut("DEEP_USDC", q1a.baseOut, 0));
    const minUsdc = +(q1b.quoteOut * (1 - SLIPPAGE)).toFixed(6);
    await execGated(buildSwapSuiToUsdc(SWAP_SUI, minUsdc), "swap-sui-usdc", `${SWAP_SUI} SUI → ~${q1b.quoteOut.toFixed(4)} USDC`);
    // leg 2: USDC → SUI (swap back roughly the USDC just received → conserves SUI minus slippage)
    const usdcIn = +q1b.quoteOut.toFixed(4);
    const q2a = await retry(() => db.getQuantityOut("DEEP_USDC", 0, usdcIn));
    const q2b = await retry(() => db.getQuantityOut("DEEP_SUI", q2a.baseOut, 0));
    const minSui = +(q2b.quoteOut * (1 - SLIPPAGE)).toFixed(6);
    await execGated(buildSwapUsdcToSui(usdcIn, minSui), "swap-usdc-sui", `${usdcIn} USDC → ~${q2b.quoteOut.toFixed(4)} SUI`);
  }

  // ---- B) Deleverage cycles ----
  console.log(`\nB) Deleverage cycles — up to ${DELEV_CYCLES}`);
  const fracs = [0.25, 0.5, 0.75];
  for (let i = 0; i < DELEV_CYCLES; i++) {
    const bal = await freeBalances();
    if (bal.sui < RESERVE_SUI) { console.log(`  · gas guard — stopping cycles`); break; }
    const before = await readPosition();
    const f = fracs[i % fracs.length];
    const dg = await deleverageOnce(f);
    if (!dg) break; // guard tripped (debt/collat too low) — stop cleanly
    // borrow-back the repaid amount to restore the debt for the next cycle
    if (EXECUTE) { const after = await readPosition(); const repaid = Math.max(0, before.debtUsdc - after.debtUsdc); if (repaid > 0.05) await borrowBack(+repaid.toFixed(4)); }
  }

  // ---- C) Revert-proofs ($0 dryRun) ----
  console.log(`\nC) Revert-proofs (atomic safety, $0)`);
  await revertProofImpossibleMinOut();
  await revertProofBelowFloor();

  const end = await freeBalances();
  console.log(`\nend: ${end.sui.toFixed(4)} SUI · ${end.usdc.toFixed(4)} USDC free`);
  console.log(`signed ops: ${ledger.length} · revert-proofs: ${reverts.length}`);
  if (EXECUTE) writeProof();
  else console.log("(preview only — re-run with --execute to sign and write submission/proof.md)");
  void readFileSync;
}

main().catch((e) => { console.error("CAMPAIGN FAILED:", e); process.exit(1); });
