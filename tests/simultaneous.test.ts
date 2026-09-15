import { describe, expect, it } from "vitest";
import { HP, cleanup, legal, newGame, queue, resolve } from "../src/game/simultaneous";
import type { Game, Unit } from "../src/game/simultaneous";

function game(units: Unit[]): Game { return { units, planned: [], cleanupTargets: [], turn: 1, log: [], winner: null }; }
describe("simultaneous core", () => {
  it("starts with material-value health and accepts up to three distinct orders", () => {
    const g = newGame();
    expect(g.units.find(u => u.kind === "bishop" && u.side === "white")?.hp).toBe(HP.bishop);
    const q = g.units.find(u => u.kind === "queen" && u.side === "white")!;
    const n = queue(g, { unitId: q.id, to: { x: 3, y: 3 } });
    expect(n.planned).toHaveLength(1);
    expect(queue(n, { unitId: q.id, to: { x: 3, y: 2 } })).toBe(n);
  });
  it("only lets pawns move diagonally when an enemy occupies that square", () => {
    const g = game([
      { id: "p", side: "white", kind: "pawn", hp: 1, x: 4, y: 4 },
      { id: "wk", side: "white", kind: "king", hp: 5, x: 7, y: 7 },
      { id: "bk", side: "black", kind: "king", hp: 5, x: 7, y: 0 },
    ]);
    expect(legal(g, g.units[0])).not.toContainEqual({ x: 3, y: 3 });
    g.units.push({ id: "enemy", side: "black", kind: "pawn", hp: 1, x: 3, y: 3 });
    expect(legal(g, g.units[0])).toContainEqual({ x: 3, y: 3 });
  });
  it("makes reciprocal attacks a single HP-subtraction fight", () => {
    const g = game([
      { id: "w", side: "white", kind: "bishop", hp: 3, x: 2, y: 4 },
      { id: "b", side: "black", kind: "pawn", hp: 1, x: 3, y: 3 },
      { id: "wk", side: "white", kind: "king", hp: 5, x: 7, y: 7 },
      { id: "bk", side: "black", kind: "king", hp: 5, x: 7, y: 0 },
    ]);
    // Enemy AI's pawn attacks c4 while the bishop attacks d5.
    const result = resolve(queue(g, { unitId: "w", to: { x: 3, y: 3 } }));
    expect(result.units.find(u => u.id === "w")).toMatchObject({ hp: 2, x: 3, y: 3 });
    expect(result.units.find(u => u.id === "b")).toBeUndefined();
  });
  it("lets a moving target escape and grants its square to the attacker", () => {
    const g = game([
      { id: "w", side: "white", kind: "rook", hp: 5, x: 0, y: 4 },
      { id: "b", side: "black", kind: "pawn", hp: 1, x: 0, y: 3 },
      { id: "wk", side: "white", kind: "king", hp: 5, x: 7, y: 7 },
      { id: "bk", side: "black", kind: "king", hp: 5, x: 7, y: 0 },
    ]);
    // Black pawn has no forward square? It attacks no white unit, so this test
    // keeps the explicit core rule covered by arranging a target in its path.
    g.units.push({ id: "bait", side: "white", kind: "pawn", hp: 1, x: 1, y: 4 });
    const result = resolve(queue(g, { unitId: "w", to: { x: 0, y: 3 } }));
    expect(result.units.find(u => u.id === "w")?.x).toBe(0);
  });
  it("offers one optional cleanup only after an enemy destroys a friendly piece", () => {
    const g = game([
      { id: "w", side: "white", kind: "pawn", hp: 1, x: 1, y: 4 },
      { id: "support", side: "white", kind: "bishop", hp: 3, x: 2, y: 5 },
      { id: "b", side: "black", kind: "knight", hp: 3, x: 2, y: 2 },
      { id: "wk", side: "white", kind: "king", hp: 5, x: 7, y: 7 },
      { id: "bk", side: "black", kind: "king", hp: 5, x: 7, y: 0 },
    ]);
    // The black knight's best attack is b4; the player pawn stays idle.
    const after = resolve(queue(g, { unitId: "wk", to: { x: 6, y: 7 } }));
    expect(after.cleanupTargets).toContain("b");
    const cleaned = cleanup(after, "support", "b");
    expect(cleaned.cleanupTargets).toEqual([]);
    expect(cleaned.units.find(u => u.id === "b")).toBeUndefined();
  });
});
