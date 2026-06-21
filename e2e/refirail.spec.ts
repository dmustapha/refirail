// File: e2e/refirail.spec.ts  (T4 — end-to-end against the live demo on :3000, redesigned multi-route app)
// Wallet-signing is an extension flow (not automatable) → covered by the real on-chain scripts.
// These specs prove the landing + /app read / preview / picker / a11y layer with REAL API data.
import { test, expect, type ConsoleMessage } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const DEMO = "0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3";

function trackConsole(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error" && !/favicon|Download the React DevTools/i.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

test("landing renders the hero + live/illustrative numbers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Move your loan/i })).toBeVisible();
  await expect(page.getByText(/Sui mainnet/i).first()).toBeVisible();
  // the two hero metrics render (either live or illustrative)
  await expect(page.getByText(/health|APR/i).first()).toBeVisible({ timeout: 30_000 });
});

test("/app loads the position + cross-lender picker (Navi actionable, AlphaLend view-only)", async ({ page }) => {
  const errors = trackConsole(page);
  await page.goto("/app");
  await expect(page.getByText(/your position, ready to settle/i)).toBeVisible();
  await expect(page.getByText(/Reading the position on-chain/i)).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByText(/Your positions across lenders/i)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/Actionable/i)).toBeVisible();
  await expect(page.getByText(/View only/i)).toBeVisible();
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("deleverage preview: projected health + fee-free DeepBook route", async ({ page }) => {
  test.setTimeout(180_000);
  // pre-warm the cold Suilend gRPC + DeepBook so the UI preview is fast
  await page.request.post("/api/deleverage", { data: { address: DEMO, fraction: 0.5 }, timeout: 90_000 }).catch(() => {});
  await page.goto("/app");
  await expect(page.getByRole("button", { name: "Reduce my risk" })).toHaveAttribute("aria-pressed", "true", { timeout: 45_000 });
  // the panel auto-previews at 50% → the projected note + fee-free route render
  await expect(page.getByText(/projected/i).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("SUI → DEEP → USDC").first()).toBeVisible();
});

test("refinance preview: slider + destination picker + projected health-after", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/app");
  await expect(page.getByText(/your position, ready to settle/i)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Move to a cheaper rate" }).click();
  await expect(page.getByText(/Move how much/i)).toBeVisible(); // the partial-refinance slider
  await expect(page.getByText(/Refinance to Suilend/i)).toBeVisible();
  await page.getByRole("button", { name: /Preview refinance/i }).click();
  // populated before/after with a projected health-after, OR an honest abort — never a crash
  const projected = page.getByText(/projected/i);
  const abort = page.getByText(/could not|revert|unavailable|no Navi/i);
  await expect(projected.or(abort).first()).toBeVisible({ timeout: 120_000 });
});

test("accessibility: no serious/critical axe violations on /app", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByText(/your position, ready to settle/i)).toBeVisible({ timeout: 45_000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`).join("\n")).toBe("");
});
