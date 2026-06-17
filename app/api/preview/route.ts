// File: app/api/preview/route.ts
import { NextResponse } from "next/server";
import { makeSuiClient } from "@/lib/clients";
import { buildRefinancePTB } from "@/lib/refinance";
import { simulateRefinance } from "@/lib/simulate";
import { toBase64 } from "@mysten/sui/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, abortReason: "invalid json" }, { status: 400 });
  }
  const { address, debtAtomic, collateralAtomic, bufferBps } = body ?? {};
  if (!address || !debtAtomic || !collateralAtomic) {
    return NextResponse.json({ ok: false, abortReason: "missing params" }, { status: 400 });
  }
  try {
    const suiClient = makeSuiClient();
    const tx = await buildRefinancePTB({
      sender: address,
      suiClient,
      debtAtomic: BigInt(debtAtomic),
      collateralAtomic: BigInt(collateralAtomic),
      bufferBps: bufferBps != null ? Number(bufferBps) : undefined,
    });
    const sim = await simulateRefinance(suiClient, tx, address);
    let txB64: string | undefined;
    if (sim.ok) {
      const bytes = await tx.build({ client: suiClient });
      txB64 = toBase64(bytes);
    }
    return NextResponse.json({ ...sim, txB64 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, abortReason: e?.message ?? "build error" }, { status: 503 });
  }
}
