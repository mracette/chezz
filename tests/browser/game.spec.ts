import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import * as THREE from "three";
import { plan } from "../strategy";
import { same } from "../../src/game/engine";
import type { Game } from "../../src/game/engine";
import { coord, newGame } from "../../src/game/engine";

async function state(page: Page): Promise<Game> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("chezz.run.v1")!));
}
async function square(
  page: Page,
  x: number,
  y: number,
  piece = false,
  hoverOnly = false,
) {
  const box = (await page.locator(".three-board canvas").boundingBox())!;
  const aspect = box.width / box.height,
    h = Math.max(7.75, 9.5 / aspect);
  const camera = new THREE.OrthographicCamera(
    (-h * aspect) / 2,
    (h * aspect) / 2,
    h / 2,
    -h / 2,
    0.1,
    100,
  );
  camera.position.set(0, 12.3, 10.5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const pos = new THREE.Vector3(x - 3.5, piece ? 0.35 : 0, y - 3.5).project(
    camera,
  );
  const screenX = box.x + ((pos.x + 1) * box.width) / 2;
  const screenY = box.y + ((1 - pos.y) * box.height) / 2;
  if (hoverOnly) await page.mouse.move(screenX, screenY);
  else await page.mouse.click(screenX, screenY);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "chezz.prefs.v1",
      JSON.stringify({ sound: false, fast: true, reduced: true }),
    ),
  );
});
test("canvas movement, attacks, enemy phase, and save/resume", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  await square(page, 6, 5, true);
  await expect(page.locator(".piece-title h3")).toHaveText("Knight");
  await square(page, 5, 3);
  await expect.poll(async () => (await state(page)).active).toBe("p4");
  const target = page.getByRole("button", {
    name: "f6 enemy pawn 6 health",
    exact: true,
  });
  await target.focus();
  await expect(
    page.getByRole("region", { name: "Attack preview" }),
  ).toContainText("6 → 3");
  await expect(page.locator('[aria-description^="Danger:"]')).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Pawn portrait", exact: true }),
  ).toBeVisible();
  expect((await state(page)).pieces.find((p) => p.id === "e1")?.hp).toBe(6);
  await target.evaluate((el) => el.blur());
  await expect(
    page.getByRole("region", { name: "Attack preview" }),
  ).toHaveCount(0);
  await square(page, 5, 2, true);
  await expect
    .poll(async () => (await state(page)).pieces.find((p) => p.id === "e1")?.hp)
    .toBe(3);
  await expect(page.locator(".ready-count")).toContainText("5 OF 6");
  expect((await state(page)).active).toBeNull();
  expect((await state(page)).pieces.find((p) => p.id === "p4")?.acted).toBe(
    true,
  );
  await expect(page.locator(".board-caption")).toContainText("SELECT A PIECE");
  await expect(
    page.getByRole("button", { name: /Finish activation/ }),
  ).toHaveCount(0);
  // The next piece can act immediately, without confirming the previous attack.
  await square(page, 1, 6, true);
  await expect(page.locator(".piece-title h3")).toHaveText("Rook");
  await square(page, 2, 6);
  await expect.poll(async () => (await state(page)).active).toBe("p2");
  await page.getByRole("button", { name: "End phase", exact: false }).click();
  await expect.poll(async () => (await state(page)).round).toBe(2);
  const before = await state(page);
  await page.reload();
  await expect(page.locator(".round-row")).toContainText("02");
  expect((await state(page)).pieces).toEqual(before.pieces);
  expect(errors).toEqual([]);
});
test("Escape undoes movement and allows a different move", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  await square(page, 6, 5, true);
  await square(page, 5, 3);
  await expect.poll(async () => (await state(page)).active).toBe("p4");
  await expect(page.getByRole("button", { name: /Undo ESC/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await state(page)).active).toBeNull();
  expect((await state(page)).pieces.find((p) => p.id === "p4")).toMatchObject({
    x: 6,
    y: 5,
    moved: false,
    acted: false,
  });
  await square(page, 4, 4);
  await expect
    .poll(async () => (await state(page)).pieces.find((p) => p.id === "p4")?.x)
    .toBe(4);
  await page.getByRole("button", { name: /Undo ESC/ }).click();
  await expect.poll(async () => (await state(page)).active).toBeNull();
});
test("enemy hover ranges restore the combined overlay on leave", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  const danger = page.locator('[aria-description^="Danger:"]');
  await square(page, 2, 2, true, true);
  await expect(page.locator(".legend-hint")).toHaveText(
    "Pawn · move + attack range",
  );
  const individualCount = await danger.count();
  expect(individualCount).toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Danger squares (T)" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.mouse.move(0, 0);
  await expect(danger).toHaveCount(0);
  await page.keyboard.press("t");
  const combinedCount = await danger.count();
  expect(combinedCount).toBeGreaterThan(individualCount);
  await square(page, 2, 2, true, true);
  await expect(page.locator(".legend-hint")).toHaveText(
    "Pawn · move + attack range",
  );
  await expect(danger).toHaveCount(combinedCount);
  await page.mouse.move(0, 0);
  await expect(page.locator(".legend-hint")).toContainText("Red = danger");
  await expect(danger).toHaveCount(combinedCount);
});
test("T toggles combined enemy danger squares", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  await page.keyboard.press("t");
  const toggle = page.getByRole("button", {
    name: "Danger squares (T)",
    exact: true,
  });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "a5 empty", exact: true }),
  ).toHaveAttribute("aria-description", /enemies can attack/);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[aria-description^="Danger:"]')).toHaveCount(0);
});
test("Space finishes a selected piece, then ends the phase", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  await square(page, 6, 5, true);
  await page.keyboard.press("Space");
  await expect
    .poll(
      async () => (await state(page)).pieces.find((p) => p.id === "p4")?.acted,
    )
    .toBe(true);
  expect((await state(page)).turn).toBe("player");
  expect((await state(page)).round).toBe(1);
  // Holding Space must not turn the same keypress into an end-phase command.
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", repeat: true }),
    ),
  );
  expect((await state(page)).turn).toBe("player");
  await page.keyboard.press("Space");
  await expect.poll(async () => (await state(page)).round).toBe(2);
  await expect.poll(async () => (await state(page)).turn).toBe("player");
  await expect(page.getByRole("button", { name: /End phase/ })).toBeEnabled();
  await page.keyboard.press("Space");
  await expect.poll(async () => (await state(page)).round).toBe(3);
});
for (const key of ["e", "Enter", "Space"]) {
  test(`holding ${key} cannot end a second player phase`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start run" }).click();
    const end = page.getByRole("button", { name: /End phase/ });
    if (key !== "e") await end.focus();
    await page.keyboard.down(key);
    await expect.poll(async () => (await state(page)).round).toBe(2);
    await expect(end).toBeEnabled();
    // Repeat after the entire enemy phase and lockout have elapsed.
    if (key !== "e") await end.focus();
    await page.keyboard.down(key);
    await page.keyboard.up(key);
    await expect(end).toBeEnabled();
    expect((await state(page)).round).toBe(2);
    expect((await state(page)).turn).toBe("player");
    await end.click();
    await expect.poll(async () => (await state(page)).round).toBe(3);
  });
}
test("end-phase clicks do not carry into the next turn", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  const end = page.getByRole("button", { name: /End phase/ });
  await end.click();
  await end.dispatchEvent("click", { detail: 1 });
  await expect.poll(async () => (await state(page)).round).toBe(2);
  await expect(end).toBeDisabled();
  await page.keyboard.press("e");
  await expect(end).toBeEnabled();
  // A delayed second click of a double-click must still be discarded.
  await end.dispatchEvent("click", { detail: 2 });
  expect((await state(page)).turn).toBe("player");
  expect((await state(page)).round).toBe(2);
  await end.click();
  await expect.poll(async () => (await state(page)).round).toBe(3);
});
test("consumable targeting and settings work on a phone viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  await page.getByRole("button", { name: "Unmake USE" }).click();
  const button = page.getByRole("button", { name: "e4 empty", exact: true });
  await button.focus();
  await button.press("Enter");
  await expect
    .poll(async () =>
      (await state(page)).holes.some((p) => p.x === 4 && p.y === 4),
    )
    .toBe(true);
  expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBe(390);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
});
test("a complete six-battle run is playable through the browser UI", async ({
  page,
}) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Start run" }).click();
  let iterations = 0;
  while (iterations++ < 650) {
    const g = await state(page);
    if (g.screen === "victory") {
      await expect(
        page.getByRole("heading", { name: "Floor complete." }),
      ).toBeVisible();
      break;
    }
    expect(g.screen, "A normal UI run must remain winnable").not.toBe("defeat");
    if (g.screen === "battle") {
      if (g.turn === "enemy") {
        await expect
          .poll(
            async () => {
              const s = await state(page);
              return s.turn === "player" || s.screen !== "battle";
            },
            { timeout: 15000, intervals: [100, 200] },
          )
          .toBe(true);
        continue;
      }
      const king = g.pieces.find(
        (p) => p.side === "player" && p.kind === "king",
      )!;
      if (
        king.hp <= king.maxHp - 4 &&
        !g.active &&
        !g.consumed &&
        g.inventory.includes("repair")
      ) {
        await page.getByRole("button", { name: "Second Breath USE" }).click();
        const btn = page.getByRole("button", {
          name: new RegExp("^" + coord(king) + " player king "),
        });
        await btn.focus();
        await btn.press("Enter");
        continue;
      }
      const action = plan(g);
      if (!action) {
        await page
          .getByRole("button", { name: "End phase", exact: false })
          .click();
        continue;
      }
      const p = g.pieces.find((p) => p.id === action.id)!;
      // The keyboard-accessible board exercises the same handlers as pointer input.
      const select = page.getByRole("button", {
        name: new RegExp("^" + coord(p) + " player " + p.kind + " "),
      });
      await select.focus();
      await select.press("Enter");
      if (!same(p, action.pos)) {
        const dest = page.getByRole("button", {
          name: coord(action.pos) + " empty",
          exact: true,
        });
        await dest.focus();
        await dest.press("Enter");
      }
      if (action.target) {
        const t = g.pieces.find((p) => p.id === action.target)!;
        const target = page.getByRole("button", {
          name: new RegExp("^" + coord(t) + " enemy " + t.kind + " "),
        });
        await target.focus();
        await target.press("Enter");
      } else
        await page.getByRole("button", { name: "Finish activation" }).click();
      await expect
        .poll(async () => (await state(page)).serial)
        .toBeGreaterThan(g.serial);
    } else if (g.screen === "reward")
      await page.getByRole("button", { name: "Visit shop" }).click();
    else if (g.screen === "shop") {
      const rank = (id: string) =>
        id === "heal"
          ? g.kingHp < g.kingMax - 3
            ? 100
            : 0
          : id === "spoils"
            ? 90
            : id === "resonance"
              ? 85
              : id === "sermon"
                ? 80
                : id === "fork"
                  ? 75
                  : id === "ascension"
                    ? 70
                    : id === "momentum"
                      ? 60
                      : id === "repair"
                        ? 50
                        : 20;
      for (const offer of g.offers
        .map((id, i) => ({ id, i }))
        .sort((a, b) => rank(b.id) - rank(a.id))) {
        const button = page
          .locator(".shop-card")
          .nth(offer.i)
          .getByRole("button");
        if (await button.isEnabled()) await button.click();
      }
      await page.getByRole("button", { name: "Continue" }).click();
    } else if (g.screen === "event")
      await page
        .getByRole("button", {
          name:
            g.kingHp < g.kingMax - 4
              ? /Heal your king/
              : /Trade health for gold/,
        })
        .click();
  }
  expect(iterations).toBeLessThan(650);
  expect((await state(page)).screen).toBe("victory");
  expect(errors).toEqual([]);
});
test("a regular king capture wins with defenders still alive", async ({
  page,
}) => {
  const g = newGame();
  g.material = -10;
  const queen = g.pieces.find((p) => p.id === "p1")!;
  queen.x = 3;
  queen.y = 2;
  const king = g.pieces.find((p) => p.side === "enemy" && p.kind === "king")!;
  king.x = 3;
  king.y = 0;
  king.hp = 1;
  await page.addInitScript(
    (g) => localStorage.setItem("chezz.run.v1", JSON.stringify(g)),
    g,
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Capture the king." }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Enemy king HP" }),
  ).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("button", { name: /^d6 player queen/ }).press("Enter");
  await page.getByRole("button", { name: /^d8 enemy king/ }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "King captured." }),
  ).toBeVisible();
  expect((await state(page)).pieces.some((p) => p.side === "enemy")).toBe(true);
  expect((await state(page)).material).toBe(-10);
  await page.getByRole("button", { name: "Visit shop" }).click();
  await page.getByRole("button", { name: "Continue", exact: false }).click();
  await expect(
    page.getByRole("progressbar", { name: "Enemy king HP" }),
  ).toHaveAttribute("aria-valuenow", "10");
});
test("the boss can be defeated and produces a results screen", async ({
  page,
}) => {
  const g = newGame();
  g.floor = 5;
  g.pieces = g.pieces.filter(
    (p) => p.side === "player" && (p.kind === "king" || p.kind === "queen"),
  );
  g.pieces.push({
    id: "boss",
    kind: "king",
    side: "enemy",
    x: 3,
    y: 4,
    hp: 1,
    maxHp: 20,
    moved: false,
    acted: false,
    ward: 0,
    veiled: false,
  });
  await page.addInitScript(
    (g) => localStorage.setItem("chezz.run.v1", JSON.stringify(g)),
    g,
  );
  await page.goto("/");
  const select = page.getByRole("button", { name: /^d2 player queen/ });
  await select.focus();
  await select.press("Enter");
  const target = page.getByRole("button", { name: /^d4 enemy king/ });
  await target.focus();
  await expect(
    page.getByRole("region", { name: "Attack preview" }),
  ).toContainText("LETHAL");
  await expect(
    page.getByRole("region", { name: "Attack preview" }),
  ).toContainText("1 → 0");
  await target.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Floor complete." }),
  ).toBeVisible();
});
