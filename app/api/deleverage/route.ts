// File: app/api/deleverage/route.ts
// Preview a deleverage: read the live position, size the slice from a live DeepBook quote, build the
// PTB, dryRun it, and return the economics (debt↓ / collateral↓ / HEALTH↑ + surplus). No signature.
// Mirrors /api/preview's validation discipline (clean 400 vs downstream 503).
import { NextResponse } from "next/server";
import { makeSuiClient } from "@/lib/clients";
import { makeDeepBook } from "@/lib/protocols/deepbook";
import { getPositionView } from "@/lib/position";
import { sizeDeleverage } from "@/lib/deleverageQuote";
import { buildDeleveragePTB } from "@/lib/deleverage";
import { simulateRefinance } from "@/lib/simulate";
import { withRetry } from "@/lib/retry";
import { warm } from "@/lib/warm";
import { toBase64 } from "@mysten/sui/utils";
import type { DeleverageResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  warm();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, abortReason: "invalid json" }, { status: 400 });
  }
  const { address, fraction } = body ?? {};
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(address)) {
    return NextResponse.json({ ok: false, abortReason: "invalid address" }, { status: 400 });
  }
  const f = Number(fraction);
  if (!Number.isFinite(f) || f <= 0 || f > 0.9) {
    return NextResponse.json({ ok: false, abortReason: "fraction must be in (0, 0.9]" }, { status: 400 });
  }

  try {
    const suiClient = makeSuiClient();
    const db = makeDeepBook(suiClient, address);

    const pos = await withRetry(() => getPositionView(address));
    if (!pos.hasPosition || !pos.debt || !pos.collateral) {
      return NextResponse.json({ ok: false, abortReason: "no Navi SUI/USDC position" }, { status: 200 });
    }

    const debtAtomic = BigInt(Math.round(pos.debt.amountHuman * 1e6));
    const size = await withRetry(() => sizeDeleverage(db, debtAtomic, f, pos.collateral!.amountHuman));
    if (!size.ok) {
      return NextResponse.json({ ok: false, abortReason: size.reason }, { status: 200 });
    }

    const tx = await withRetry(() =>
      buildDeleveragePTB({ sender: address, suiClient, repayAtomic: size.repayAtomic, collateralAtomic: size.collateralAtomic }),
    );
    const sim = await withRetry(() => simulateRefinance(suiClient, tx, address));

    // Economics — all from real reads (no fabrication). healthAfter is Navi-side (this position).
    const collatBeforeUsd = pos.collateral.usd ?? 0;
    const debtBeforeUsd = pos.debt.usd ?? 0;
    const suiPrice = pos.collateral.amountHuman > 0 ? collatBeforeUsd / pos.collateral.amountHuman : 0;
    const soldUsd = size.suiToSell * suiPrice;
    const collatAfterUsd = +Math.max(0, collatBeforeUsd - soldUsd).toFixed(2);
    const debtAfterUsd = +Math.max(0, debtBeforeUsd - size.repayHuman).toFixed(2);
    const healthBefore = pos.healthFactor;
    let healthAfter: number | undefined;
    if (healthBefore != null && collatBeforeUsd > 0 && debtAfterUsd > 0) {
      const liqThreshold = (healthBefore * debtBeforeUsd) / collatBeforeUsd;
      healthAfter = +((collatAfterUsd * liqThreshold) / debtAfterUsd).toFixed(2);
    }
    const surplusUsdc = +Math.max(0, size.quotedUsdcOut - size.repayHuman).toFixed(4);

    let txB64: string | undefined;
    if (sim.ok) txB64 = toBase64(await tx.build({ client: suiClient }));

    const result: DeleverageResult = {
      ok: sim.ok,
      abortReason: sim.abortReason,
      txB64,
      healthBefore,
      healthAfter,
      debtBeforeUsd,
      debtAfterUsd,
      collatBeforeUsd,
      collatAfterUsd,
      suiSold: size.suiToSell,
      usdcRepaid: +size.repayHuman.toFixed(6),
      surplusUsdc,
      route: "SUI → DEEP → USDC",
      feeUsd: 0,
    };
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, abortReason: e?.message ?? "build error" }, { status: 503 });
  }
}
