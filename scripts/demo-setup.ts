// File: scripts/demo-setup.ts
// Brings the demo wallet's Navi position UP to a clean demo size so refinance ($ debt to move)
// AND deleverage (sell several SUI ≥ the 0.35 floor) both read well on camera.
//   - ADDITIVE + idempotent: reads the live position, deposits/borrows only the delta to the target,
//     so it can be re-run before recording to restore the position after the on-chain campaign.
//   - Reuses open-position.ts's proven legs: appendNaviOracleRefresh (DEV-019) -> deposit SUI
//     collateral -> borrow native USDC -> transfer to sender.
//   - GAS GUARD: refuses to deposit if it would drop free SUI below RESERVE_SUI (5).
//   - SAFETY: dry-runs the PTB; only signs the real tx if the dry-run succeeds (real data only).
require("dotenv").config({ path: ".env.local" });

import { Transaction } from "@mysten/sui/transactions";
import { depositCoinPTB, borrowCoinPTB, getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { NAVI } from "../lib/config";
import { suiAtomic, usdcAtomic } from "../lib/amounts";
import { appendNaviOracleRefresh } from "../lib/protocols/navi";

// Demo-position targets (human units). ~15 SUI collateral / ~4.5 USDC debt → health ~1.9.
// NB: deliberately NOT named DEMO_COLLATERAL_SUI/DEMO_DEBT_USDC — those record the *current* size.
const TARGET_COLLATERAL_SUI = Number(process.env.DEMO_TARGET_COLLATERAL_SUI ?? 15);
const TARGET_DEBT_USDC = Number(process.env.DEMO_TARGET_DEBT_USDC ?? 4.5);
const RESERVE_SUI = 5; // never drop free SUI below this (gas headroom for the rest of the hackathon)
const EPS = 0.05; // don't bother with sub-0.05 top-ups (avoids dust legs)

async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < n; i++) {
    try { return await fn(); } catch (e) { last = e; if (i < n - 1) await new Promise((r) => setTimeout(r, 1200)); }
  }
  throw last;
}

function readPosition(positions: any[]): { collateralSui: number; debtUsdc: number } {
  let collateralSui = 0, debtUsdc = 0;
  for (const p of positions) {
    const s = p?.["navi-lending-supply"];
    const b = p?.["navi-lending-borrow"];
    if (s && String(s.token?.coinType ?? "").includes("sui::SUI") && Number(s.amount) > 0)
      collateralSui += Number(s.amount);
    if (b && String(b.token?.coinType ?? "").toLowerCase().includes("usdc") && Number(b.amount) > 0)
      debtUsdc += Number(b.amount);
  }
  return { collateralSui, debtUsdc };
}

async function freeSui(client: ReturnType<typeof makeSuiClient>, owner: string): Promise<number> {
  const bal = await client.getBalance({ owner, coinType: "0x2::sui::SUI" });
  return Number(bal.totalBalance) / 1e9;
}

async function buildTopUpTx(sender: string, depositSui: number, borrowUsdc: number): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(sender);
  // Refresh Navi's SUI+USDC oracle before any borrow (DEV-019 staleness guard).
  await appendNaviOracleRefresh(tx, sender);
  if (depositSui > 0) {
    const [collateral] = tx.splitCoins(tx.gas, [Number(suiAtomic(depositSui))]);
    await depositCoinPTB(tx as never, NAVI.SUI_ASSET_ID, collateral as never, {
      amount: Number(suiAtomic(depositSui)),
    });
  }
  if (borrowUsdc > 0) {
    const usdc = await borrowCoinPTB(tx as never, NAVI.USDC_ASSET_ID, Number(usdcAtomic(borrowUsdc)));
    tx.transferObjects([usdc as never], sender);
  }
  return tx;
}

async function main() {
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();
  console.log("sender:", sender);

  const positions = await retry(() => getLendingPositions(sender as never));
  const { collateralSui, debtUsdc } = readPosition(positions);
  const free = await freeSui(client, sender);
  console.log(`current: collateral ${collateralSui.toFixed(4)} SUI · debt ${debtUsdc.toFixed(4)} USDC · free ${free.toFixed(4)} SUI`);

  let depositSui = Math.max(0, +(TARGET_COLLATERAL_SUI - collateralSui).toFixed(4));
  const borrowUsdc = Math.max(0, +(TARGET_DEBT_USDC - debtUsdc).toFixed(4));

  // Gas guard: clamp the deposit so free SUI never drops below RESERVE_SUI (plus ~0.2 gas headroom).
  const maxDeposit = +(free - RESERVE_SUI - 0.2).toFixed(4);
  if (depositSui > maxDeposit) {
    console.warn(`gas guard: clamping deposit ${depositSui} -> ${Math.max(0, maxDeposit)} SUI (reserve ${RESERVE_SUI})`);
    depositSui = Math.max(0, maxDeposit);
  }

  if (depositSui < EPS && borrowUsdc < EPS) {
    console.log("already at (or above) demo target — no-op.");
    return;
  }
  console.log(`top-up: deposit ${depositSui} SUI · borrow ${borrowUsdc} USDC`);

  // SAFETY: dry-run first.
  const dryTx = await buildTopUpTx(sender, depositSui, borrowUsdc);
  const built = await dryTx.build({ client: client as never });
  const sim = await retry(() => client.dryRunTransactionBlock({ transactionBlock: built }));
  console.log("=== DRY-RUN ===", sim.effects?.status?.status);
  if (sim.effects?.status?.status !== "success") {
    console.error("dry-run FAILED — aborting, no real tx sent.");
    console.error(JSON.stringify(sim.effects?.status, null, 2));
    process.exit(1);
  }
  console.log("balanceChanges:", JSON.stringify(sim.balanceChanges, null, 2));

  if (process.argv.includes("--execute")) {
    const tx = await buildTopUpTx(sender, depositSui, borrowUsdc);
    const res = await client.signAndExecuteTransaction({
      signer: kp, transaction: tx, options: { showEffects: true, showBalanceChanges: true },
    });
    console.log("=== EXECUTED ===", res.effects?.status?.status);
    console.log("digest:", res.digest);
    console.log("suiscan:", `https://suiscan.xyz/mainnet/tx/${res.digest}`);
    if (res.effects?.status?.status !== "success") process.exit(1);

    const after = readPosition(await retry(() => getLendingPositions(sender as never)));
    console.log(`post: collateral ${after.collateralSui.toFixed(4)} SUI · debt ${after.debtUsdc.toFixed(4)} USDC`);
  } else {
    console.log("dry-run GREEN. Re-run with --execute to send the real tx.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
