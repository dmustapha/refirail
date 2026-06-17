// File: scripts/open-position.ts
// Opens the tiny REAL Navi demo position on Sui mainnet: deposit SUI collateral + borrow native USDC.
// Derived from ARCHITECTURE.md §14. Adapted to the funded demo wallet's reality (DEV-014):
//   - wallet holds ~1.94 SUI total, in the address-balance accumulator (zero discrete Coin<SUI> objects),
//     so amounts are sized for that (deposit ~1.0 SUI, borrow 0.3 USDC native, assetId 10).
//   - idempotent: if a Navi USDC borrow already exists, it is a no-op.
//   - SAFETY: dry-runs the open PTB first; only signs the real tx if the dry-run succeeds.
require("dotenv").config({ path: ".env.local" });

import { Transaction } from "@mysten/sui/transactions";
import { depositCoinPTB, borrowCoinPTB, getLendingPositions } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { NAVI, COINS } from "../lib/config";
import { suiAtomic, usdcAtomic } from "../lib/amounts";

const COLLATERAL_SUI = 1.0; // ~1.0 SUI collateral (keeps gas + refinance headroom from ~1.94 total)
const BORROW_USDC = 0.3; // native USDC (assetId 10), matches the Task 1.3-proven amount

async function retry<T>(fn: () => Promise<T>, n = 3): Promise<T> {
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

function hasUsdcBorrow(positions: Awaited<ReturnType<typeof getLendingPositions>>): boolean {
  return positions.some((p) => {
    const borrow = p["navi-lending-borrow"];
    return !!borrow && Number(borrow.amount) > 0;
  });
}

async function buildOpenTx(sender: string): Promise<Transaction> {
  const tx = new Transaction();
  tx.setSender(sender);
  // Split collateral from the gas coin (Navi deposit's standard SUI path).
  const [collateral] = tx.splitCoins(tx.gas, [Number(suiAtomic(COLLATERAL_SUI))]);
  // Deposit SUI as Navi collateral (assetId 0). `tx as never`: Navi bundles its own nested
  // @mysten/sui whose Transaction type is nominally distinct from our root v2.18 (same DEV-005
  // boundary cast as lib/protocols/navi.ts — type-only, zero functional effect).
  await depositCoinPTB(tx as never, NAVI.SUI_ASSET_ID, collateral as never, {
    amount: Number(suiAtomic(COLLATERAL_SUI)),
  });
  // Borrow native USDC (assetId 10) -> returns a USDC coin handle.
  const usdc = await borrowCoinPTB(tx as never, NAVI.USDC_ASSET_ID, Number(usdcAtomic(BORROW_USDC)));
  tx.transferObjects([usdc as never], sender);
  return tx;
}

async function main() {
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();
  console.log("sender:", sender);

  // Idempotency guard — never double-open.
  const existing = await retry(() => getLendingPositions(sender as never));
  if (hasUsdcBorrow(existing)) {
    console.log("position already present — no-op.");
    console.log(JSON.stringify(existing, null, 2));
    return;
  }

  // SAFETY: dry-run before any real execution.
  const dryTx = await buildOpenTx(sender);
  const built = await dryTx.build({ client: client as never });
  const sim = await retry(() => client.dryRunTransactionBlock({ transactionBlock: built }));
  console.log("=== DRY-RUN ===");
  console.log("status:", sim.effects?.status?.status);
  console.log("balanceChanges:", JSON.stringify(sim.balanceChanges, null, 2));
  if (sim.effects?.status?.status !== "success") {
    console.error("dry-run FAILED — aborting, no real tx sent.");
    console.error(JSON.stringify(sim.effects?.status, null, 2));
    process.exit(1);
  }

  // REAL execute (single attempt) — build a fresh tx to avoid stale gas/version state.
  const tx = await buildOpenTx(sender);
  const res = await client.signAndExecuteTransaction({
    signer: kp,
    transaction: tx,
    options: { showEffects: true, showBalanceChanges: true },
  });
  console.log("=== EXECUTED ===");
  console.log("digest:", res.digest);
  console.log("status:", res.effects?.status?.status);
  console.log("suiscan:", `https://suiscan.xyz/mainnet/tx/${res.digest}`);

  if (res.effects?.status?.status !== "success") {
    console.error("execution FAILED on-chain.");
    process.exit(1);
  }

  console.log(
    `Set NEXT_PUBLIC_DEMO_ADDRESS=${sender}, DEMO_COLLATERAL_SUI=${COLLATERAL_SUI}, DEMO_DEBT_USDC=${BORROW_USDC}`,
  );

  // Post-open verification.
  const after = await retry(() => getLendingPositions(sender as never));
  console.log("=== POST-OPEN POSITIONS ===");
  console.log(JSON.stringify(after, null, 2));
  void COINS;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
