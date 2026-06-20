// File: scripts/return-funds.ts
// Return ALL value in the demo wallet to the user, as USDC, in three safe stages:
//   1. CLOSE   — repay the full Navi USDC debt (from free USDC) + withdraw all SUI collateral.
//   2. SWAP    — swap all SUI (minus a gas reserve) to USDC via the fee-free DeepBook two-hop.
//   3. SEND    — transfer the entire USDC balance to RECIPIENT.
// Dry-run by default (no signature, nothing moves). Pass --execute to actually sign+send.
// Sui gas is paid in SUI, so a tiny SUI dust stays in the DEMO wallet (never the recipient's).
require("dotenv").config({ path: ".env.local" });
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { makeDeepBook, appendSwapSuiToUsdcTwoHop } from "../lib/protocols/deepbook";
import { appendNaviOracleRefresh, appendNaviRepayUSDC, appendNaviWithdrawSUI } from "../lib/protocols/navi";
import { getPositionView } from "../lib/position";
import { COINS } from "../lib/config";
import { withRetry } from "../lib/retry";

const RECIPIENT = "0x966e4a70500a067e24fc6902f3388f02f01c3f62607894b69ef85b246742883b";
const DEMO = "0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3";
const GAS_RESERVE = 300_000_000n; // 0.3 SUI kept for gas (swap is gas-heavy; explicit budget set below)
const DEBT_BUFFER = 50_000n; // +0.05 USDC over-repay so accrued interest fully clears (excess refunds)
const COLLAT_MARGIN = 2_000_000n; // withdraw 0.002 SUI under read collateral to avoid over-withdraw abort
const SLIPPAGE = 0.97; // accept >= 97% of the quoted USDC out (3% tolerance)
const EXECUTE = process.argv.includes("--execute");

const client = makeSuiClient();
const kp = makeDemoKeypair();

async function dryRun(tx: Transaction, label: string) {
  const bytes = await tx.build({ client });
  const r = await client.dryRunTransactionBlock({ transactionBlock: bytes });
  const status = r.effects?.status?.status;
  console.log(`  [dryRun ${label}] status=${status}${status !== "success" ? " :: " + JSON.stringify(r.effects?.status) : ""}`);
  if (status !== "success") throw new Error(`${label} dry-run failed`);
  for (const bc of r.balanceChanges ?? []) {
    const t = bc.coinType.split("::").pop();
    console.log(`     ${t}: ${bc.amount}`);
  }
  return bytes;
}

async function exec(tx: Transaction, label: string) {
  const bytes = await dryRun(tx, label);
  if (!EXECUTE) { console.log(`  [skip exec ${label}] (dry-run only — pass --execute to send)`); return null; }
  const res = await client.signAndExecuteTransaction({ signer: kp, transaction: bytes, options: { showEffects: true } });
  await client.waitForTransaction({ digest: res.digest });
  console.log(`  [EXECUTED ${label}] https://suiscan.xyz/mainnet/tx/${res.digest}`);
  return res.digest;
}

async function main() {
  const sender = kp.getPublicKey().toSuiAddress();
  if (sender !== DEMO) throw new Error(`signer ${sender} != demo ${DEMO}`);
  if (!/^0x[0-9a-fA-F]{64}$/.test(RECIPIENT)) throw new Error("bad recipient");
  console.log(`Return funds: ${sender}\n  -> recipient: ${RECIPIENT}\n  mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

  // ---- TEST: send exactly 1 USDC to verify the recipient address, then stop ----
  if (process.argv.includes("--test")) {
    console.log("TEST — send 1.00 USDC to recipient (verification only)");
    const tx = new Transaction();
    tx.setSender(sender);
    const oneUsdc = tx.add(coinWithBalance({ type: COINS.USDC, balance: 1_000_000n })) as any;
    tx.transferObjects([oneUsdc], RECIPIENT);
    await exec(tx, "test-1usdc");
    console.log("\nTEST complete. Confirm the recipient received 1.00 USDC, then run the full return.");
    return;
  }

  // ---- STAGE 1: CLOSE the Navi position ----
  console.log("STAGE 1 — close Navi position (repay debt + withdraw collateral)");
  const pos = await withRetry(() => getPositionView(sender));
  if (pos.hasPosition && pos.debt && pos.collateral) {
    const debtAtomic = BigInt(Math.ceil(pos.debt.amountHuman * 1e6)) + DEBT_BUFFER;
    const collatAtomic = BigInt(Math.floor(pos.collateral.amountHuman * 1e9)) - COLLAT_MARGIN;
    console.log(`  debt ${pos.debt.amountHuman} USDC (repay ${Number(debtAtomic) / 1e6}), collateral ${pos.collateral.amountHuman} SUI (withdraw ${Number(collatAtomic) / 1e9})`);
    const tx = new Transaction();
    tx.setSender(sender);
    await appendNaviOracleRefresh(tx, sender);
    const repayCoin = tx.add(coinWithBalance({ type: COINS.USDC, balance: debtAtomic })) as any;
    await appendNaviRepayUSDC(tx, repayCoin, debtAtomic);
    const suiOut = await appendNaviWithdrawSUI(tx, collatAtomic);
    tx.transferObjects([suiOut as any], sender);
    await exec(tx, "close");
  } else {
    console.log("  no open Navi position — skipping close.");
  }

  // ---- STAGE 2: SWAP all SUI -> USDC ----
  console.log("\nSTAGE 2 — swap SUI -> USDC (keep gas reserve)");
  if (EXECUTE) {
    // NOTE: getCoins(SUI) returns empty on the configured RPC; getBalance is authoritative for SUI total.
    const bal = await withRetry(() => client.getBalance({ owner: sender, coinType: COINS.SUI }));
    const total = BigInt(bal.totalBalance);
    const swapAtomic = total - GAS_RESERVE;
    if (swapAtomic > 0n) {
      const swapHuman = Number(swapAtomic) / 1e9;
      const db = makeDeepBook(client, sender);
      const h1 = await db.getQuantityOut("DEEP_SUI", 0, swapHuman);
      const h2 = await db.getQuantityOut("DEEP_USDC", h1.baseOut, 0);
      const minOut = +(h2.quoteOut * SLIPPAGE).toFixed(6);
      console.log(`  swap ${swapHuman} SUI -> ~${h2.quoteOut.toFixed(4)} USDC (minOut ${minOut})`);
      const tx = new Transaction();
      tx.setSender(sender);
      tx.setGasBudget(150_000_000n); // 0.15 SUI cap (covered by the 0.3 reserve), so the split leaves enough for gas
      const suiCoin = tx.add(coinWithBalance({ type: COINS.SUI, balance: swapAtomic })) as any;
      const { usdcOut, suiRemainder, deepRemainders } = appendSwapSuiToUsdcTwoHop(db, tx, suiCoin, minOut);
      tx.transferObjects([usdcOut as any, suiRemainder as any, ...(deepRemainders as any[])], sender);
      await exec(tx, "swap");
    } else {
      console.log("  not enough SUI above gas reserve to swap.");
    }
  } else {
    // In dry-run we cannot see post-close SUI; estimate from current reads (getBalance, not getCoins).
    const bal = await withRetry(() => client.getBalance({ owner: sender, coinType: COINS.SUI }));
    const collat = pos.collateral ? BigInt(Math.floor(pos.collateral.amountHuman * 1e9)) - COLLAT_MARGIN : 0n;
    const projected = BigInt(bal.totalBalance) + collat - GAS_RESERVE;
    const db = makeDeepBook(client, sender);
    const h1 = await db.getQuantityOut("DEEP_SUI", 0, Number(projected) / 1e9);
    const h2 = await db.getQuantityOut("DEEP_USDC", h1.baseOut, 0);
    console.log(`  [estimate] after close, swap ~${(Number(projected) / 1e9).toFixed(4)} SUI -> ~${h2.quoteOut.toFixed(4)} USDC`);
    (globalThis as any).__swapEst = h2.quoteOut;
  }

  // ---- STAGE 3: SEND all USDC ----
  console.log("\nSTAGE 3 — send all USDC to recipient");
  if (EXECUTE) {
    const usdc = await withRetry(() => client.getCoins({ owner: sender, coinType: COINS.USDC }));
    if (!usdc.data.length) { console.log("  no USDC to send."); return; }
    const total = usdc.data.reduce((n, c) => n + BigInt(c.balance), 0n);
    console.log(`  sending ${Number(total) / 1e6} USDC`);
    const tx = new Transaction();
    tx.setSender(sender);
    tx.setGasBudget(30_000_000n); // 0.03 SUI — simple merge+transfer
    const [first, ...rest] = usdc.data.map((c) => c.coinObjectId);
    if (rest.length) tx.mergeCoins(first, rest);
    tx.transferObjects([first], RECIPIENT);
    await exec(tx, "send");
    console.log("\nDONE. All funds returned as USDC.");
  } else {
    const usdc = await withRetry(() => client.getCoins({ owner: sender, coinType: COINS.USDC }));
    const freeUsdc = usdc.data.reduce((n, c) => n + BigInt(c.balance), 0n);
    const repay = pos.debt ? BigInt(Math.ceil(pos.debt.amountHuman * 1e6)) : 0n;
    const est = (globalThis as any).__swapEst ?? 0;
    const finalUsdc = Number(freeUsdc - repay) / 1e6 + est;
    console.log(`  [estimate] recipient receives ~${finalUsdc.toFixed(2)} USDC total`);
    console.log("\nDRY-RUN complete. Re-run with --execute to send for real.");
  }
}

main().catch((e) => { console.error("ERROR:", e?.message ?? e); process.exit(1); });
