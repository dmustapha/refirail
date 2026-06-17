// File: scripts/seed-demo.ts
// Idempotent demo-state guard (PRD §6 / ARCHITECTURE §14): ensures a live Navi SUI/USDC
// borrow position exists for the demo wallet before any demo take. Safe to run repeatedly —
// re-running when the position is already present is a no-op. Delegates to the (already
// idempotent) open-position.ts so the seed state is EARNED (a real position opened with real
// funds), never fabricated (TASTE U7).
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });
import { execFileSync } from "node:child_process";
import { getLendingPositions } from "@naviprotocol/lending";

const ADDR = process.env.NEXT_PUBLIC_DEMO_ADDRESS;

async function hasNaviUsdcBorrow(address: string): Promise<boolean> {
  try {
    const ps = await getLendingPositions(address);
    return ps.some((p: any) => {
      const b = p?.["navi-lending-borrow"];
      return b && String(b.token?.coinType ?? "").toLowerCase().includes("usdc") && Number(b.amount) > 0.0001;
    });
  } catch {
    return false; // can't confirm → let open-position (also idempotent) decide
  }
}

async function main() {
  if (!ADDR) throw new Error("NEXT_PUBLIC_DEMO_ADDRESS missing in .env.local");
  if (await hasNaviUsdcBorrow(ADDR)) {
    console.log("demo position already present — no-op.");
    return;
  }
  console.log("no Navi USDC borrow found — opening the demo position via open-position.ts ...");
  execFileSync("npx", ["tsx", "scripts/open-position.ts"], { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
