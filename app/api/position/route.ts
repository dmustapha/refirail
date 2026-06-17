// File: app/api/position/route.ts
import { NextResponse } from "next/server";
import { getPositionView } from "@/lib/position";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address || !address.startsWith("0x")) {
    return NextResponse.json({ error: "missing or invalid address" }, { status: 400 });
  }
  try {
    const view = await getPositionView(address);
    return NextResponse.json(view);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "rpc error" }, { status: 503 });
  }
}
