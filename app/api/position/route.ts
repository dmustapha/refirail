// File: app/api/position/route.ts
import { NextResponse } from "next/server";
import { getPositionView } from "@/lib/position";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  // DEV-019 (ARCHITECTURE §18 Layer 1): a Sui address is 0x + 64 hex chars. Reject malformed input
  // as a clean 400 instead of silently coercing it to an empty-state 200.
  if (!address || !/^0x[0-9a-fA-F]{64}$/.test(address)) {
    return NextResponse.json({ error: "missing or invalid address" }, { status: 400 });
  }
  try {
    const view = await getPositionView(address);
    return NextResponse.json(view);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "rpc error" }, { status: 503 });
  }
}
