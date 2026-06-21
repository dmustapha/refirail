// File: app/api/preview/route.ts
// Preview a (partial) refinance Navi -> {Suilend|AlphaLend}: read the LIVE position server-side, build
// the PTB, dryRun it, and return the economics + a projected health-after. No signature.
import { NextResponse } from "next/server";
import { makeSuiClient } from "@/lib/clients";
import { buildRefinancePTB } from "@/lib/refinance";
import { simulateRefinance } from "@/lib/simulate";
import { healthFrom } from "@/lib/deleverageEconomics";
import { getNaviPosition } from "@/lib/position";
import { withRetry } from "@/lib/retry";
import { warm } from "@/lib/warm";
import { toBase64 } from "@mysten/sui/utils";

export const dynamic = "force-dynamic";

// SUI liquidation threshold at each destination (documented protocol risk parameters, not fabricated
// position data). Suilend SUI close-LTV = 0.80; AlphaLend SUI liquidation threshold = 0.80.
const DEST_SUI_LIQ_THRESHOLD: Record<"suilend" | "alphalend", number> = { suilend: 0.8, alphalend: 0.8 };

export async function POST(req: Request) {
  warm(); // fire-and-forget: pre-warm the slow Suilend gRPC init so previews aren't a cold start
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, abortReason: "invalid json" }, { status: 400 });
  }
  const { address, destId, fraction } = body ?? {};
  // Reject an unknown destId as a clean 400 instead of silently coercing it to suilend.
  if (destId != null && destId !== "suilend" && destId !== "alphalend") {
    return NextResponse.json({ ok: false, abortReason: "destId must be 'suilend' or 'alphalend'" }, { status: 400 });
  }
  const dest: "suilend" | "alphalend" = destId === "alphalend" ? "alphalend" : "suilend";
  // Partial refinance fraction (0, 1]; default full. Reject out-of-range as a clean 400.
  const frac = fraction == null ? 1.0 : Number(fraction);
  if (!Number.isFinite(frac) || frac <= 0 || frac > 1.0) {
    return NextResponse.json({ ok: false, abortReason: "fraction must be in (0, 1]" }, { status: 400 });
  }
  // A Sui address is 0x + 64 hex. Malformed input is a clean 400, reserving 503 for downstream failures.
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(address)) {
    return NextResponse.json({ ok: false, abortReason: "invalid address" }, { status: 400 });
  }

  try {
    const suiClient = makeSuiClient();
    // F3: read the LIVE position server-side (just-in-time), the same way /api/deleverage does, instead
    // of trusting client-passed atomics. A stale page can no longer sign a tx whose flash under-covers
    // the accrued debt (the Navi withdraw would abort 1600 on-chain and waste the user's gas).
    const pos = await withRetry(() => getNaviPosition(address));
    if (!pos.hasPosition || !pos.debt || !pos.collateral) {
      return NextResponse.json({ ok: false, abortReason: "no Navi SUI/USDC position" }, { status: 200 });
    }
    const debtAtomic = BigInt(Math.round(pos.debt.amountHuman * 1e6));
    const collateralAtomic = BigInt(Math.round(pos.collateral.amountHuman * 1e9));

    const tx = await withRetry(() =>
      buildRefinancePTB({ sender: address, suiClient, debtAtomic, collateralAtomic, destId: dest, fraction: frac }),
    );
    const sim = await withRetry(() => simulateRefinance(suiClient, tx, address));

    // F2: projected health AFTER the move = collateral * destination liquidation threshold / debt.
    // A like-for-like move scales collateral and debt together, so this is fraction-independent.
    const healthAfter = healthFrom(pos.collateral.usd, pos.debt.usd, DEST_SUI_LIQ_THRESHOLD[dest]);

    let txB64: string | undefined;
    if (sim.ok) txB64 = toBase64(await tx.build({ client: suiClient }));

    return NextResponse.json({
      ...sim,
      destId: dest,
      fraction: frac,
      healthBefore: pos.healthFactor,
      healthAfter,
      txB64,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, abortReason: e?.message ?? "build error" }, { status: 503 });
  }
}
