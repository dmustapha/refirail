// File: scripts/wallet-state.ts
// Quick read-only snapshot of the demo wallet: SUI/USDC balances + live Navi position + SUI spot.
// Used to confirm funding and size the demo position. dryRun/read only — spends nothing.
require("dotenv").config({ path: ".env.local" });

import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { makeDeepBook } from "../lib/protocols/deepbook";
import { getPositionView } from "../lib/position";
import { COINS } from "../lib/config";

async function main() {
  const c = makeSuiClient();
  const addr = makeDemoKeypair().getPublicKey().toSuiAddress();
  const db = makeDeepBook(c, addr);

  const all = await (c as any).getAllBalances({ owner: addr });
  const sui = all.find((b: any) => b.coinType === COINS.SUI);
  const usdc = all.find((b: any) => b.coinType === COINS.USDC);
  const suiHuman = Number(sui?.totalBalance ?? 0) / 1e9;
  const usdcHuman = Number(usdc?.totalBalance ?? 0) / 1e6;

  let spot = NaN;
  try { spot = await db.midPrice("SUI_USDC"); } catch {}

  console.log(`\nwallet ${addr}`);
  console.log(`  SUI  (free):  ${suiHuman.toFixed(6)}  ≈ $${(suiHuman * spot).toFixed(2)}`);
  console.log(`  USDC (free):  ${usdcHuman.toFixed(6)}`);
  console.log(`  SUI spot:     $${spot.toFixed(4)}`);

  const pos = await getPositionView(addr);
  if (pos.hasPosition) {
    console.log(`\nNavi position:`);
    console.log(`  collateral: ${pos.collateral!.amountHuman} SUI  ($${pos.collateral!.usd})`);
    console.log(`  debt:       ${pos.debt!.amountHuman} USDC  ($${pos.debt!.usd})`);
    console.log(`  health:     ${pos.healthFactor}`);
    console.log(`  APR Navi ${pos.naviAprPct}%  Suilend ${pos.suilendAprPct}%  Δ ${pos.aprDeltaPct}%`);
  } else {
    console.log(`\nNavi position: NONE — ${pos.note ?? ""}`);
  }
  const totalSui = suiHuman + (pos.collateral?.amountHuman ?? 0);
  console.log(`\n  TOTAL SUI (free + collateral): ${totalSui.toFixed(6)} ≈ $${(totalSui * spot).toFixed(2)}\n`);
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
