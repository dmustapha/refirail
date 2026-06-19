// File: app/api/deepbook/route.ts
// Live DeepBook panel feed: mid, best-execution route comparison, depth. Read-only, no signature.
import { NextResponse } from "next/server";
import { makeSuiClient } from "@/lib/clients";
import { makeDeepBook } from "@/lib/protocols/deepbook";
import { getDeepBookView } from "@/lib/deepbookView";
import { withRetry } from "@/lib/retry";
import { warm } from "@/lib/warm";

export const dynamic = "force-dynamic";

const READ_SENDER = "0x0000000000000000000000000000000000000000000000000000000000000001";

export async function GET() {
  warm();
  try {
    const c = makeSuiClient();
    const db = makeDeepBook(c, READ_SENDER);
    const view = await withRetry(() => getDeepBookView(db, 1));
    return NextResponse.json(view);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "deepbook read error" }, { status: 503 });
  }
}
