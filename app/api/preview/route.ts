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
  const { address, debtAtomic, collateralAtomic, bufferBps, destId, fraction } = body ?? {};
  const dest: "suilend" | "alphalend" = destId === "alphalend" ? "alphalend" : "suilend";
  // Partial refinance fraction (0, 1]; default full. Reject out-of-range as a clean 400.
  const frac = fraction == null ? 1.0 : Number(fraction);
  if (!Number.isFinite(frac) || frac <= 0 || frac > 1.0) {
    return NextResponse.json({ ok: false, abortReason: "fraction must be in (0, 1]" }, { status: 400 });
  }
  if (!address || !debtAtomic || !collateralAtomic) {
    return NextResponse.json({ ok: false, abortReason: "missing params" }, { status: 400 });
  }
  // DEV-019 (ARCHITECTURE §18 Layer 1): validate inputs up front so malformed input is a clean 400
  // (client error), reserving 503 for real downstream/RPC failures. A Sui address is 0x + 64 hex.
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(address)) {
    return NextResponse.json({ ok: false, abortReason: "invalid address" }, { status: 400 });
  }
  let debt: bigint, collateral: bigint, buffer: number | undefined;
  try {
    debt = BigInt(debtAtomic);
    collateral = BigInt(collateralAtomic);
    buffer = bufferBps != null ? Number(bufferBps) : undefined;
    // u64 is the Move integer ceiling. Out-of-range atomics are a client error (400), not a downstream 503.
    const U64_MAX = 18446744073709551615n; // 2^64 - 1
    if (
      debt <= 0n || collateral <= 0n ||
      debt > U64_MAX || collateral > U64_MAX ||
      (buffer != null && !Number.isFinite(buffer))
    ) {
      throw new Error("amount out of u64 range");
    }
  } catch {
    return NextResponse.json({ ok: false, abortReason: "invalid amount" }, { status: 400 });
  }
  try {
    const suiClient = makeSuiClient();
    const tx = await buildRefinancePTB({
      sender: address,
      suiClient,
      debtAtomic: debt,
      collateralAtomic: collateral,
      bufferBps: buffer,
      destId: dest,
      fraction: frac,
    });
    const sim = await simulateRefinance(suiClient, tx, address);
    let txB64: string | undefined;
    if (sim.ok) {
      const bytes = await tx.build({ client: suiClient });
      txB64 = toBase64(bytes);
    }
    return NextResponse.json({ ...sim, destId: dest, txB64 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, abortReason: e?.message ?? "build error" }, { status: 503 });
  }
}
