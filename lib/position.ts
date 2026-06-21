// File: lib/position.ts
import { getLendingPositions, getHealthFactor } from "@naviprotocol/lending";
import { initSuilend, getSuilendPositions } from "./protocols/suilend";
import { alphalendUsdcBorrowApr, getAlphalendPositions } from "./protocols/alphalend";
import { NAVI, COINS } from "./config";
import type { PositionView, Position, LenderPosition } from "./types";

// Map a per-lender read into picker positions (non-Navi positions are read-only/non-actionable).
function toPositions(lps: LenderPosition[], protocol: "alphalend" | "suilend", fallbackApr?: number): Position[] {
  return lps
    .filter((lp) => lp.collateral || lp.debt)
    .map((lp) => ({
      id: `${protocol}:${lp.positionId}`,
      protocol,
      collateral: lp.collateral,
      debt: lp.debt,
      borrowAprPct: lp.borrowAprPct ?? fallbackApr,
      healthFactor: lp.healthFactor,
      actionable: false,
    }));
}

// Pick the cheapest refinance destination by borrow APR (Suilend vs AlphaLend).
function pickDest(suilendApr?: number, alphalendApr?: number): {
  recommendedDest?: "suilend" | "alphalend";
  bestApr?: number;
} {
  const opts: { id: "suilend" | "alphalend"; apr: number }[] = [];
  if (suilendApr != null) opts.push({ id: "suilend", apr: suilendApr });
  if (alphalendApr != null) opts.push({ id: "alphalend", apr: alphalendApr });
  if (!opts.length) return {};
  const best = opts.reduce((a, b) => (b.apr < a.apr ? b : a));
  return { recommendedDest: best.id, bestApr: best.apr };
}

// DEV-010 (UNVERIFIED→VERIFIED Day-0): the documented NAVI.CONFIG_URL (/api/navi/config) returns
// only protocol object-ids + oracle feeds — NO pools/APR. The live borrow APR lives at
// /api/navi/pools[id=10].borrowIncentiveApyInfo.vaultApr (verified against live response, 2026-06-17).
const NAVI_POOLS_URL = "https://open-api.naviprotocol.io/api/navi/pools";

async function naviUsdcBorrowApr(): Promise<number | undefined> {
  // DEV-020 (Issue 4, same-definition): compare borrow-cost vs borrow-cost. `currentBorrowRate`
  // is the raw on-chain borrow interest rate (1e27/RAY-scaled annual) straight from Navi's
  // utilization rate model — the exact analogue of Suilend's interpolated borrow APR. Prefer it.
  // `borrowIncentiveApyInfo.vaultApr` (~equal here: 8.445 vs 8.446) is a derived display field and
  // shares the "incentive" namespace with reward APRs, so it's a weaker like-for-like; keep as fallback.
  try {
    const res = await fetch(NAVI_POOLS_URL).then((r) => r.json());
    const pools: any[] = res?.data ?? res ?? [];
    const usdc = pools.find(
      (p) => p.id === NAVI.USDC_ASSET_ID || String(p.coinType ?? "").endsWith("usdc::USDC"),
    );
    const ray = usdc?.currentBorrowRate; // 1e27-scaled annual borrow rate
    if (ray != null) return +((Number(ray) / 1e27) * 100).toFixed(2);
    const apr = usdc?.borrowIncentiveApyInfo?.vaultApr;
    return apr != null ? +Number(apr).toFixed(2) : undefined;
  } catch {
    return undefined;
  }
}

// DEV-010: the raw SuilendClient reserve exposes no precomputed APR; the on-chain interest-rate
// model is config.element.{interestRateUtils,interestRateAprs}. Interpolate current utilization
// against that piecewise-linear curve (utils in %, aprs in bps).
async function suilendUsdcBorrowApr(): Promise<number | undefined> {
  try {
    const client = await initSuilend();
    const reserves = (client as any).lendingMarket?.reserves ?? [];
    const usdc = reserves.find((r: any) =>
      String(r?.coinType?.name ?? r?.coinType ?? "").includes("usdc::USDC"),
    );
    const el = usdc?.config?.element;
    if (!el?.interestRateUtils || !el?.interestRateAprs) return undefined;
    const utils: number[] = el.interestRateUtils.map((u: any) => Number(u));
    const aprsBps: number[] = el.interestRateAprs.map((a: any) => Number(a.toString()));
    const borrowed = Number(usdc.borrowedAmount?.value ?? usdc.borrowedAmount ?? 0) / 1e18;
    const avail = Number(usdc.availableAmount ?? 0);
    const total = borrowed + avail;
    if (total <= 0) return undefined;
    const utilPct = (borrowed / total) * 100;
    for (let i = 1; i < utils.length; i++) {
      if (utilPct <= utils[i]) {
        const frac = utils[i] > utils[i - 1] ? (utilPct - utils[i - 1]) / (utils[i] - utils[i - 1]) : 0;
        return +((aprsBps[i - 1] + frac * (aprsBps[i] - aprsBps[i - 1])) / 100).toFixed(2);
      }
    }
    return +(aprsBps[aprsBps.length - 1] / 100).toFixed(2);
  } catch {
    return undefined;
  }
}

// DEV-011: read the REAL on-chain Navi position (no fabricated amounts; honest empty state).
// getLendingPositions(address) -> LendingPosition[]; each carries 'navi-lending-supply'/'-borrow'
// legs with { amount, valueUSD, token }. No position -> [] -> hasPosition:false (TASTE U7 / INVARIANT 3).
function legToken(leg: any): string {
  return String(leg?.token?.coinType ?? leg?.token?.type ?? leg?.token?.symbol ?? "");
}
function legAmount(leg: any): number {
  const a = Number(leg?.amount ?? 0);
  const dec = Number(leg?.token?.decimals);
  // SDK amounts are usually human units; if it looks atomic and decimals known, normalize.
  return Number.isFinite(dec) && a > 1e6 && dec >= 6 ? a / 10 ** dec : a;
}

export async function getPositionView(address: string): Promise<PositionView> {
  // Fire every read in parallel: the three APRs, the Navi raw position + health, and the cross-lender
  // position scans (AlphaLend + Suilend). The non-Navi scans are read-only (cheap-exit when absent).
  const [naviApr, suiApr, alphaApr, naviRaw, healthRaw, alphaPositions, suilendPositions] =
    await Promise.all([
      naviUsdcBorrowApr(),
      suilendUsdcBorrowApr(),
      alphalendUsdcBorrowApr(),
      getLendingPositions(address).catch(() => [] as any[]),
      getHealthFactor(address).catch(() => undefined),
      getAlphalendPositions(address),
      getSuilendPositions(address),
    ]);

  // Route against the cheapest destination; the "you save" delta reflects that route.
  const { recommendedDest, bestApr } = pickDest(suiApr, alphaApr);
  const aprDeltaPct =
    naviApr != null && bestApr != null ? +(naviApr - bestApr).toFixed(2) : undefined;

  // Collect the SUI supply (collateral) + native-USDC borrow (debt) across returned Navi positions.
  let supply: any, borrow: any;
  for (const p of naviRaw) {
    const s = p?.["navi-lending-supply"];
    const b = p?.["navi-lending-borrow"];
    if (s && legToken(s).includes("sui::SUI") && Number(s.amount) > 0) supply = s;
    if (b && legToken(b).toLowerCase().includes("usdc") && Number(b.amount) > 0) borrow = b;
  }

  // Non-Navi positions are always read-only (no source-half in the engine yet).
  const nonNavi = [
    ...toPositions(alphaPositions, "alphalend", alphaApr),
    ...toPositions(suilendPositions, "suilend", suiApr),
  ];

  // The refinance/deleverage acts on a USDC borrow against SUI collateral on Navi. No such position
  // -> honest empty state (but still surface any read-only cross-lender positions for context).
  if (!borrow || !supply) {
    return { hasPosition: false, address, naviAprPct: naviApr, suilendAprPct: suiApr,
      alphalendAprPct: alphaApr, recommendedDest, aprDeltaPct,
      positions: nonNavi.length ? nonNavi : undefined,
      note: "No Navi SUI/USDC borrow position found. Run scripts/seed-demo.ts to open the demo position." };
  }

  const healthFactor = healthRaw != null ? +Number(healthRaw).toFixed(2) : undefined;
  const collateral = { type: COINS.SUI, amountHuman: legAmount(supply), usd: +Number(supply.valueUSD ?? 0).toFixed(2) };
  const debt = { type: COINS.USDC, amountHuman: legAmount(borrow), usd: +Number(borrow.valueUSD ?? 0).toFixed(2) };

  // The Navi position is the single actionable source; non-Navi positions follow as read-only.
  const naviPosition: Position = {
    id: "navi:primary", protocol: "navi", collateral, debt,
    borrowAprPct: naviApr, healthFactor, actionable: true,
  };
  const positions = [naviPosition, ...nonNavi];

  return {
    hasPosition: true,
    address,
    collateral,
    debt,
    naviAprPct: naviApr,
    suilendAprPct: suiApr,
    alphalendAprPct: alphaApr,
    recommendedDest,
    aprDeltaPct,
    healthFactor,
    positions,
    selectedPositionId: naviPosition.id,
  };
}
