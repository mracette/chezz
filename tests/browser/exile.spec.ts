import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { coord } from "../../src/game/exile";
import type { Run } from "../../src/game/exile";
import { choosePlan } from "../exile-strategy";

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("chezz.exile.v1")!) as Run);

test("planning, visible resolution, input lock, and save/resume", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin the rebellion" }).click();
  await page.getByRole("button", { name: /^b1 white king/ }).click();
  await page.getByRole("button", { name: /^b2 empty/ }).click();
  await expect(page.getByText("king → b2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resolve turn", exact: false }).click();
  await expect(page.getByText("Both plans revealed.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolving…" })).toBeDisabled();
  await expect(page.locator(".plan-arrows polyline")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^b1 white king/ })).toBeDisabled();
  await page.getByRole("button", { name: "Skip playback" }).click();
  await expect.poll(async () => (await saved(page)).turn).toBe(2);
  await page.reload();
  await expect(page.getByRole("button", { name: /^b2 white king/ })).toBeEnabled();
  await page.getByRole("button", { name: /^b2 white king/ }).click();
  await page.getByRole("button", { name: /^Defend in place/ }).click();
  await expect(page.getByText("king defends b2", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/exile-board.png", fullPage: true });
});

test("compact layout remains usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Begin the rebellion" }).click();
  await page.getByRole("button", { name: /^b1 white king/ }).click();
  await page.getByRole("button", { name: /^Defend in place/ }).click();
  await expect(page.getByRole("button", { name: "Resolve turn", exact: false })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/exile-mobile.png", fullPage: true });
});

for (const mode of ["retaliation", "ambush"] as const) test(`complete exile run through browser controls: ${mode}`, async ({ page }) => {
  test.setTimeout(150000);
  await page.goto("/");
  if (mode === "ambush") await page.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Begin the rebellion" }).click();
  await page.getByRole("checkbox", { name: "Fast playback" }).check();
  let iterations = 0;
  while (iterations++ < 65) {
    const g = await saved(page);
    if (g.phase === "victory" || g.phase === "defeat") break;
    if (g.phase === "camp") {
      await expect(page.getByRole("dialog", { name: "Roadside camp" })).toBeVisible();
      if (g.encounter === 0) await page.screenshot({ path: `test-results/exile-camp-${mode}.png`, fullPage: true });
      await page.getByRole("button", { name: g.units.find(u => u.id === "king")!.hp < 3 ? /Mend the king/ : /Recruit a bishop/ }).click();
      await expect.poll(async () => (await saved(page)).encounter).toBe(g.encounter + 1);
      continue;
    }
    if (g.phase === "cleanup") { await page.getByRole("button", { name: "Let it go" }).click(); await expect.poll(async () => (await saved(page)).phase).toBe("planning"); continue; }
    const orders = choosePlan(g);
    for (const o of orders) {
      const u = g.units.find(u => u.id === o.unitId)!;
      await page.getByRole("button", { name: new RegExp(`^${coord(g, u)} white ${u.kind}`) }).click();
      if (o.defend) await page.getByRole("button", { name: /^Defend in place/ }).click();
      else await page.getByRole("button", { name: new RegExp(`^${coord(g, o.to)} `) }).click();
    }
    await page.getByRole("button", { name: "Resolve turn", exact: false }).click();
    await expect.poll(async () => (await saved(page)).turn, { timeout: 12000 }).toBe(g.turn + 1);
  }
  const result = await saved(page);
  expect(result.phase).toBe("victory");
  await expect(page.getByRole("dialog", { name: "Exile run complete" })).toBeVisible();
  await page.getByRole("button", { name: /Try .* on the same boards/ }).click();
  await expect.poll(async () => (await saved(page)).mode).toBe(mode === "retaliation" ? "ambush" : "retaliation");
  expect((await saved(page)).encounter).toBe(0);
});
