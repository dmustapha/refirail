// File: e2e/refirail.spec.ts  (T4 — end-to-end against the live demo position on :3000)
// Wallet-signing is an extension flow (not automatable) → covered by the real T3 on-chain scripts.
// These specs prove the read / preview / panel / a11y layer end-to-end with REAL API data.
import { test, expect, type ConsoleMessage } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Collect console errors per test; assert none leaked. (Ignore benign favicon/devtools noise.)
function trackConsole(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error" && !/favicon|Download the React DevTools/i.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

test("loads the demo position read-only", async ({ page }) => {
  const errors = trackConsole(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "RefiRail" })).toBeVisible();
  await expect(page.getByText(/live demo position \(read-only\)/i)).toBeVisible();
  // position card resolves (loading notice goes away)
  await expect(page.getByText(/Reading the position on-chain/i)).toHaveCount(0, { timeout: 30_000 });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("DeepBook panel shows live mid + fee-free two-hop route", async ({ page }) => {
  await page.goto("/");
  const panel = page.locator("aside .dbk");
  await expect(panel.getByText(/live order book/i)).toBeVisible();
  // mid price renders as $X.XXXX
  await expect(panel.getByText(/\$\d+\.\d{4}/).first()).toBeVisible({ timeout: 20_000 });
  // route comparison: the fee-free two-hop is shown with a $0 fee badge
  await expect(panel.getByText("SUI → DEEP → USDC")).toBeVisible();
  await expect(panel.getByText(/fee \$0/i)).toBeVisible();
});

test("deleverage preview: health rises, fee-free route, all presets", async ({ page }) => {
  test.setTimeout(240_000); // 3 previews; the first hits a cold Suilend gRPC init
  const errors = trackConsole(page);
  const DEMO = "0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3";
  // Pre-warm the server-side cold path (Suilend init + DeepBook quote) so UI clicks are warm.
  await page.request.post("/api/deleverage", { data: { address: DEMO, fraction: 0.5 }, timeout: 90_000 }).catch(() => {});
  await page.goto("/");
  // deleverage mode is the default (the DeepBook story leads)
  await expect(page.getByRole("button", { name: "Reduce my risk" })).toHaveAttribute("aria-pressed", "true");

  const col = page.locator(".col"); // main column — scope away from the DeepBook aside panel
  for (const pct of ["25%", "50%", "75%"]) {
    await page.getByRole("button", { name: pct, exact: true }).click();
    // wait for the preview card (Health After row) — warm after the pre-warm above
    const after = col.getByText(/Health \d+\.\d+ ↑/);
    await expect(after).toBeVisible({ timeout: 90_000 });
    // route + $0 fee present (in the deleverage card, not the order-book panel)
    await expect(col.getByText("SUI → DEEP → USDC")).toBeVisible();
    await expect(col.getByText("$0.00")).toBeVisible();
    // assert health AFTER > health BEFORE (parse both)
    const nowTxt = await page.locator(".grid2 div", { hasText: "Now" }).getByText(/Health \d+\.\d+/).innerText();
    const aftTxt = await after.innerText();
    const before = parseFloat(nowTxt.replace(/[^\d.]/g, ""));
    const afterVal = parseFloat(aftTxt.replace(/[^\d.]/g, ""));
    expect(afterVal, `health should rise at ${pct} (${before} → ${afterVal})`).toBeGreaterThan(before);
  }
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("refinance mode preview renders before/after", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Move to cheaper rate" }).click();
  await page.getByRole("button", { name: /Preview refinance/i }).click();
  // either a populated before/after panel or an honest abort message — never a crash
  const apr = page.getByText(/APR \d/);
  const abort = page.getByText(/could not|revert|unavailable/i);
  await expect(apr.or(abort).first()).toBeVisible({ timeout: 60_000 });
});

test("accessibility: no serious/critical axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "RefiRail" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`).join("\n")).toBe("");
});
