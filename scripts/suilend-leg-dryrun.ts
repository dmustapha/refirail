// File: scripts/suilend-leg-dryrun.ts
// Task 1.3 — THE critical sub-gate (RISK 1, #1 unknown):
// prove createObligation -> deposit(self-split SUI) -> refreshAll -> borrow(USDC) -> transfer cap
// dry-runs GREEN against live Sui mainnet, in ISOLATION. dryRun spends NOTHING.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { Transaction } from "@mysten/sui/transactions";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { initSuilend, appendSuilendDepositBorrow } from "../lib/protocols/suilend";
import { simulateRefinance } from "../lib/simulate";
import { suiAtomic, usdcAtomic } from "../lib/amounts";
import { COINS } from "../lib/config";

// borrowHuman: ~0.3 USDC against ~1 SUI collateral is a comfortable, safe LTV.
const COLLATERAL_SUI = 1.0;
const BORROW_USDC = 0.3;

async function main() {
  const client = makeSuiClient();
  const kp = makeDemoKeypair();
  const sender = kp.getPublicKey().toSuiAddress();

  const suilend = await initSuilend();

  const tx = new Transaction();
  tx.setSender(sender);

  // split ~1 SUI from gas to deposit as Suilend collateral (fresh same-PTB coin)
  const [suiCoin] = tx.splitCoins(tx.gas, [Number(suiAtomic(COLLATERAL_SUI))]);

  const { borrowedCoin, cap } = await appendSuilendDepositBorrow(suilend, tx, {
    suiCoin: suiCoin as never,
    collateralType: COINS.SUI,
    debtType: COINS.USDC,
    borrowAtomic: usdcAtomic(BORROW_USDC),
    sender,
  });

  // caller MUST transfer the non-droppable obligation cap + the borrowed USDC to the sender
  tx.transferObjects([cap as never, borrowedCoin as never], sender);

  const sim = await simulateRefinance(client, tx, sender);
  console.log("dryRun ok:", sim.ok);
  if (!sim.ok) console.error("abortReason:", sim.abortReason);
  console.log("balanceChanges:", JSON.stringify(sim.balanceChanges, null, 2));
  console.log(`(sender=${sender}, collateral=${COLLATERAL_SUI} SUI, borrow=${BORROW_USDC} USDC)`);
  process.exit(sim.ok ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
