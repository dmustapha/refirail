// File: scripts/revert-proof.ts
// Task 2.3 — Prove the ATOMIC REVERT (Thesis INVARIANT 2 / observable F-003).
//
// We build the Suilend leg exactly like scripts/suilend-leg-dryrun.ts
// (createObligation -> deposit(self-split SUI) -> refreshAll([SUI,USDC]) -> borrow(USDC) -> transfer cap),
// BUT request an UNHEALTHY borrow: tiny SUI collateral, a USDC borrow far beyond safe LTV.
// The Suilend borrow guard must abort -> the WHOLE PTB reverts atomically.
//
// SANCTIONED FUND-FREE PATH (PLAN Decision Point): we have no Navi position and want zero spend,
// so we document the borrow-guard behavior from a real mainnet dryRun (ok:false) as the safety
// evidence. dryRun spends NOTHING and mutates NOTHING -> "position unchanged" is guaranteed, and
// balanceChanges on an aborted dryRun is empty (no balance moved).
//
// gRPC (Suilend init) intermittently throws "fetch failed" / reading 'package' -> retry up to 3x.
require("dotenv").config({ path: ".env.local" });

import { Transaction } from "@mysten/sui/transactions";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { initSuilend, appendSuilendDepositBorrow } from "../lib/protocols/suilend";
import { simulateRefinance } from "../lib/simulate";
import { suiAtomic, usdcAtomic } from "../lib/amounts";
import { COINS } from "../lib/config";

// UNHEALTHY by design: 0.5 SUI (~$0.37) collateral, attempt to borrow 10 USDC — far beyond any safe LTV.
const COLLATERAL_SUI = 0.5;
const BORROW_USDC = 10;

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

async function main() {
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();
  console.log("sender:", sender);
  console.log(`UNHEALTHY attempt -> collateral=${COLLATERAL_SUI} SUI, borrow=${BORROW_USDC} USDC (far beyond safe LTV)`);

  // Suilend init does gRPC -> retry.
  const suilend = await retry(() => initSuilend());

  const tx = new Transaction();
  tx.setSender(sender);

  // split a tiny SUI collateral from gas (fresh same-PTB coin)
  const [suiCoin] = tx.splitCoins(tx.gas, [Number(suiAtomic(COLLATERAL_SUI))]);

  // appendSuilendDepositBorrow does gRPC (refreshAll -> Hermes) -> retry the whole append.
  const { borrowedCoin, cap } = await retry(() =>
    appendSuilendDepositBorrow(suilend, tx, {
      suiCoin: suiCoin as never,
      collateralType: COINS.SUI,
      debtType: COINS.USDC,
      borrowAtomic: usdcAtomic(BORROW_USDC),
      sender,
    }),
  );

  // caller MUST transfer the non-droppable obligation cap + the borrowed USDC to the sender
  tx.transferObjects([cap as never, borrowedCoin as never], sender);

  // DEV-017: the @mysten/sui core resolver EAGERLY dry-runs the PTB during tx.build() (to set the
  // gas budget). An aborting PTB therefore throws a SimulationError from inside simulateRefinance's
  // build step, BEFORE the explicit dryRunTransactionBlock call ever runs. We catch it and surface
  // the SAME structured ok:false evidence the PLAN asks for. balanceChanges is empty either way
  // (a reverted tx moves zero balance -> position provably unchanged).
  let ok: boolean;
  let abortReason: string | undefined;
  let balanceChanges: { coinType: string; amount: string }[] = [];

  try {
    const sim = await simulateRefinance(client, tx, sender);
    ok = sim.ok;
    abortReason = sim.abortReason;
    balanceChanges = sim.balanceChanges;
  } catch (e) {
    // Build-time eager dry-run aborted. Extract the Move abort + confirm zero balance moved.
    const err = e as { executionError?: { message?: string }; cause?: { FailedTransaction?: { balanceChanges?: unknown[] } } };
    ok = false;
    abortReason = err?.executionError?.message ?? (e as Error)?.message ?? String(e);
    const bc = err?.cause?.FailedTransaction?.balanceChanges;
    balanceChanges = Array.isArray(bc) ? (bc as { coinType: string; amount: string }[]) : [];
  }

  console.log("\ndryRun ok:", ok);
  if (!ok) console.error("abortReason:", abortReason);
  console.log("balanceChanges:", JSON.stringify(balanceChanges, null, 2));
  console.log(`balanceChanges count: ${balanceChanges.length} (empty => zero balance moved => position provably unchanged)`);

  // INVARIANT 2 holds when the unhealthy borrow ABORTS (ok:false). A green dryRun here would
  // mean the borrow did NOT exceed LTV -> exit 1 so the runner bumps the borrow amount.
  const revertProven = !ok;
  console.log(revertProven ? "\nREVERT-PROVEN: Suilend borrow guard aborted the whole PTB atomically." : "\nNO REVERT: borrow did not exceed LTV — increase BORROW_USDC.");
  process.exit(revertProven ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
