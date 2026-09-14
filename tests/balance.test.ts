import { it, expect } from "vitest";
import { newGame } from "../src/game/engine";
import { simulate } from "./strategy";
it("the complete floor is winnable with both starting armies", () => {
  for (const set of ["mahogany", "speed"]) {
    const { g, actions, battles } = simulate(newGame("BETWEEN-WORLDS", set));
    console.log(
      JSON.stringify({
        set,
        result: g.screen,
        actions,
        battles,
        build: g.gambits,
        upgrades: g.upgrades,
        pieces: g.pieces.map((p) => ({
          kind: p.kind,
          side: p.side,
          hp: p.hp,
          pos: [p.x, p.y],
        })),
      }),
    );
    expect(actions).toBeLessThan(800);
    expect(g.screen).toBe("victory");
  }
});
it("seeded playthroughs reach a terminal state without illegal overlaps", () => {
  for (const seed of ["PRISM", "ECLIPSE", "SMALL-INFINITY"]) {
    const { g, actions } = simulate(newGame(seed));
    expect(actions).toBeLessThan(800);
    expect(["victory", "defeat"]).toContain(g.screen);
    expect(new Set(g.pieces.map((p) => p.x + "," + p.y)).size).toBe(
      g.pieces.length,
    );
    expect(g.pieces.every((p) => p.hp > 0 && p.hp <= p.maxHp)).toBe(true);
  }
});
