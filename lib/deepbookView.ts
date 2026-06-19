// File: lib/deepbookView.ts
// Live DeepBook panel data: best-execution route comparison (fee-free two-hop vs DEEP-charging direct)
// + order-book depth. All read-only (getQuantityOut/midPrice/getLevel2TicksFromMid). Real data only.
import type { DeepBookClient } from "@mysten/deepbook-v3";
import type { DeepBookView } from "./types";

export async function getDeepBookView(db: DeepBookClient, refSui = 1): Promise<DeepBookView> {
  const mid = await db.midPrice("SUI_USDC");

  // Fee-free two-hop: SUI → DEEP → USDC through the whitelisted pairs.
  const h1 = await db.getQuantityOut("DEEP_SUI", 0, refSui); // SUI(quote) → DEEP(base)
  const h2 = await db.getQuantityOut("DEEP_USDC", h1.baseOut, 0); // DEEP(base) → USDC(quote)
  const twoHop = {
    usdcOut: +h2.quoteOut.toFixed(6),
    deepFee: +(h1.deepRequired + h2.deepRequired).toFixed(6),
    available: h2.quoteOut > 0,
  };

  // Direct SUI → USDC (non-whitelisted → needs a DEEP taker fee we don't hold).
  let direct = { usdcOut: 0, deepFee: 0, available: false };
  try {
    const d = await db.getQuantityOut("SUI_USDC", refSui, 0);
    direct = { usdcOut: +d.quoteOut.toFixed(6), deepFee: +d.deepRequired.toFixed(6), available: d.quoteOut > 0 };
  } catch {
    /* direct route unquotable at this size → leave unavailable */
  }

  // We hold no DEEP, so a fee-charging direct route is not executable → best = the fee-free two-hop.
  const best: "twoHop" | "direct" =
    direct.deepFee > 0 || !direct.available ? "twoHop" : direct.usdcOut > twoHop.usdcOut ? "direct" : "twoHop";

  // Order-book depth around mid.
  let bids: { price: number; qty: number }[] = [];
  let asks: { price: number; qty: number }[] = [];
  try {
    const t = (await db.getLevel2TicksFromMid("SUI_USDC", 8)) as any;
    const bp = t.bid_prices ?? t.bidPrices ?? [];
    const bq = t.bid_quantities ?? t.bidQuantities ?? [];
    const ap = t.ask_prices ?? t.askPrices ?? [];
    const aq = t.ask_quantities ?? t.askQuantities ?? [];
    bids = bp.slice(0, 6).map((price: number, i: number) => ({ price: +Number(price).toFixed(5), qty: +Number(bq[i] ?? 0).toFixed(3) }));
    asks = ap.slice(0, 6).map((price: number, i: number) => ({ price: +Number(price).toFixed(5), qty: +Number(aq[i] ?? 0).toFixed(3) }));
  } catch {
    /* depth read failed → empty bars (UI shows mid + route only) */
  }

  return { midSuiUsdc: +mid.toFixed(6), refSui, twoHop, direct, best, depth: { bids, asks } };
}
