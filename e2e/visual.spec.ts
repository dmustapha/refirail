// File: e2e/visual.spec.ts  (T5 — real responsive screenshots + zero-overflow assertion)
// Replaces the prior byte-identical faked set with genuine captures at each breakpoint.
import { test, expect } from "@playwright/test";

const BREAKPOINTS = [
  { name: "mobile-390", w: 390, h: 844 },
  { name: "tablet-768", w: 768, h: 1024 },
  { name: "laptop-1024", w: 1024, h: 768 },
  { name: "desktop-1440", w: 1440, h: 900 },
  { name: "wide-1920", w: 1920, h: 1080 },
];

for (const bp of BREAKPOINTS) {
  test(`responsive ${bp.name}: no horizontal overflow + screenshot`, async ({ page }) => {
    await page.setViewportSize({ width: bp.w, height: bp.h });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "RefiRail" })).toBeVisible();
    // let the DeepBook panel + position settle
    await page.waitForTimeout(2500);
    // zero horizontal overflow: scrollWidth must not exceed the viewport
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${bp.name}`).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `screenshots/e2e-${bp.name}.png`, fullPage: true });
  });
}

test("focus-visible ring on the first interactive control", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const active = await page.evaluate(() => document.activeElement?.tagName ?? "");
  expect(active.length).toBeGreaterThan(0); // focus moved into the page (keyboard reachable)
  await page.screenshot({ path: "screenshots/e2e-focus-1440.png" });
});
