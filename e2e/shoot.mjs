// Quick visual capture of the two-action screen (also seeds the T4/T5 Playwright infra).
import { chromium } from "@playwright/test";

const URL = process.env.URL || "http://localhost:3000";
const b = await chromium.launch();

async function shoot(name, width, height, actions) {
  const page = await b.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  // wait for the live position to load (PositionCard) — cold gRPC can take a few s
  await page.waitForSelector(".dbk", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(6000);
  if (actions) await actions(page);
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  console.log(`shot screenshots/${name}.png`);
  await page.close();
}

await shoot("widen-desktop-landing", 1440, 900);
await shoot("widen-desktop-deleverage", 1440, 900, async (page) => {
  await page.getByRole("button", { name: "50%" }).click();
  await page.waitForTimeout(7000); // /api/deleverage dryRun
});
await shoot("widen-mobile-landing", 390, 844);

await b.close();
console.log("done");
