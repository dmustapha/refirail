// File: scripts/wallet-state.ts
// Quick read-only snapshot of the demo wallet: SUI/USDC balances + live Navi position + SUI spot.
// Used to confirm funding and size the demo position. dryRun/read only — spends nothing.
require("dotenv").config({ path: ".env.local" });

import { getLendingPositions, getHealthFactor } from "@naviprotocol/lending";
import { makeSuiClient, makeDemoKeypair } from "../lib/clients";
import { makeDeepBook } from "../lib/protocols/deepbook";
import { getPositionView } from "../lib/position";
import { COINS } from "../lib/config";

// Raw collateral/debt read with retries — the Navi indexer (getLendingPositions) intermittently
// returns [] on a transient error, which getPositionView swallows to hasPosition:false. For honest
// money-accounting we retry and report collateral even when there is no borrow leg.
async function rawNaviState(addr: string): Promise<{ collateralSui: number; debtUsdc: number; health: string } | null> {
  for (let i = 0; i < 5; i++) {
    try {
      const ps: any[] = await getLendingPositions(addr as never);
      let collateralSui = 0, debtUsdc = 0;
      for (const p of ps) {
        const s = p?.["navi-lending-supply"], b = p?.["navi-lending-borrow"];
        if (s && String(s.token?.coinType ?? "").includes("sui::SUI") && Number(s.amount) > 0) collateralSui += Number(s.amount);
        if (b && String(b.token?.coinType ?? "").toLowerCase().includes("usdc") && Number(b.amount) > 0) debtUsdc += Number(b.amount);
      }
      if (collateralSui > 0 || debtUsdc > 0) {
        let health = "?"; try { health = String(await getHealthFactor(addr as never)); } catch {}
        return { collateralSui, debtUsdc, health };
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 6000));
  }
  return null;
}

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
  const raw = await rawNaviState(addr);
  let collateralSui = 0, debtUsdc = 0;
  if (pos.hasPosition) {
    collateralSui = pos.collateral!.amountHuman; debtUsdc = pos.debt!.amountHuman;
    console.log(`\nNavi position (borrow active):`);
    console.log(`  collateral: ${collateralSui} SUI  ($${pos.collateral!.usd})`);
    console.log(`  debt:       ${debtUsdc} USDC  ($${pos.debt!.usd})`);
    console.log(`  health:     ${pos.healthFactor}`);
    console.log(`  APR Navi ${pos.naviAprPct}%  Suilend ${pos.suilendAprPct}%  Δ ${pos.aprDeltaPct}%`);
  } else if (raw) {
    collateralSui = raw.collateralSui; debtUsdc = raw.debtUsdc;
    console.log(`\nNavi position (no borrow leg):`);
    console.log(`  collateral: ${collateralSui.toFixed(6)} SUI  ($${(collateralSui * spot).toFixed(2)})`);
    console.log(`  debt:       ${debtUsdc.toFixed(6)} USDC`);
    console.log(`  health:     ${raw.health}`);
  } else {
    console.log(`\nNavi position: NONE (indexer returned empty after retries) — ${pos.note ?? ""}`);
  }
  const totalSui = suiHuman + collateralSui;
  const netUsd = totalSui * spot + usdcHuman - debtUsdc;
  console.log(`\n  TOTAL SUI (free + collateral): ${totalSui.toFixed(6)} ≈ $${(totalSui * spot).toFixed(2)}`);
  console.log(`  NET WORTH (SUI + USDC − debt):  ≈ $${netUsd.toFixed(2)}\n`);
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
