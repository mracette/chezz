import { describe, it, expect } from "vitest";
import {
  newGame,
  makePiece,
  moves,
  attackSquares,
  attack,
  move,
  undoMove,
  dangerSquares,
  waitPiece,
  endPhase,
  endEnemyPhase,
  enemyStep,
  previewDamage,
  useConsumable,
  loadGame,
  openShop,
  buy,
  continueRun,
  chooseEvent,
  releaseGambit,
  bonusMet,
  same,
  victims,
} from "../src/game/engine";
import type { Game } from "../src/game/engine";
function arena(): Game {
  const g = newGame();
  g.pieces = [
    makePiece("king", "player", 7, 7, "king"),
    makePiece("rook", "player", 1, 4, "rook"),
    makePiece("pawn", "enemy", 1, 3, "enemy"),
  ];
  g.gambits = [];
  return g;
}
describe("activation and geometry", () => {
  it("danger includes move-then-attack and counts each enemy only once", () => {
    const g = arena();
    g.pieces.push(makePiece("rook", "enemy", 3, 1, "second"));
    g.pieces.find((p) => p.id === "enemy")!.acted = true;
    const before = structuredClone(g);
    const danger = dangerSquares(g);
    expect(
      danger.find((p) => same(p, { x: 4, y: 3 }))?.attackers.sort(),
    ).toEqual(["enemy", "second"]);
    expect(danger.find((p) => same(p, { x: 6, y: 3 }))).toBeUndefined();
    expect(g).toEqual(before);
  });
  it("danger respects missing squares, knight jumps, and trapdoors", () => {
    const g = arena();
    g.holes = Array.from({ length: 8 }, (_, y) => ({ x: 2, y }));
    expect(dangerSquares(g).some((p) => p.x > 2)).toBe(false);
    g.pieces.find((p) => p.id === "enemy")!.kind = "knight";
    expect(dangerSquares(g).some((p) => same(p, { x: 4, y: 3 }))).toBe(true);
    const trapped = arena();
    trapped.trap = [
      { x: 2, y: 3 },
      { x: 6, y: 1 },
    ];
    expect(dangerSquares(trapped).some((p) => same(p, { x: 6, y: 2 }))).toBe(
      true,
    );
  });
  it("undo restores swaps and movement buffs, including after reload", () => {
    const g = arena();
    g.upgrades = ["bulwark"];
    g.inventory = ["trapdoor"];
    const before = useConsumable(g, 0, [
      { x: 2, y: 4 },
      { x: 1, y: 3 },
    ]);
    const moved = move(before, "rook", { x: 2, y: 4 });
    expect(moved.pieces.find((p) => p.id === "rook")?.ward).toBe(2);
    expect(moved.trap).toBeNull();
    const restored = undoMove(loadGame(JSON.stringify(moved))!);
    expect(restored.pieces).toEqual(before.pieces);
    expect(restored.trap).toEqual(before.trap);
    expect(restored.log).toEqual(before.log);
    expect(restored.inventory).toEqual(before.inventory);
    expect(restored.consumed).toBe(true);
    expect(restored.active).toBeNull();
    expect(restored.serial).toBeGreaterThan(moved.serial);
    expect(move(restored, "rook", { x: 2, y: 4 }).pieces).toEqual(moved.pieces);
  });
  it("attacking, finishing, and ending the phase commit a move", () => {
    const g = arena();
    g.pieces[1].x = 2;
    const moved = move(g, "rook", { x: 1, y: 4 });
    for (const committed of [
      attack(moved, "rook", "enemy"),
      waitPiece(moved, "rook"),
      endPhase(moved),
    ]) {
      expect(committed.undo).toBeUndefined();
      expect(undoMove(committed)).toBe(committed);
    }
  });
  it("a unit can move then attack but cannot act twice", () => {
    let g = arena();
    g.pieces[1].x = 2;
    g = move(g, "rook", { x: 1, y: 4 });
    expect(g.active).toBe("rook");
    const hit = attack(g, "rook", "enemy");
    expect(hit.pieces.find((p) => p.id === "rook")?.acted).toBe(true);
    expect(attack(hit, "rook", "enemy")).toBe(hit);
    expect(move(hit, "rook", { x: 2, y: 4 })).toBe(hit);
  });
  it("moving locks activation until attack or wait", () => {
    const g = move(arena(), "rook", { x: 2, y: 4 });
    expect(move(g, "king", { x: 6, y: 7 })).toBe(g);
    const done = waitPiece(g, "rook");
    expect(move(done, "king", { x: 6, y: 7 })).not.toBe(done);
  });
  it("movement cannot cross a wall of missing squares; knights jump it", () => {
    const g = arena();
    g.holes = Array.from({ length: 8 }, (_, y) => ({ x: 2, y }));
    g.pieces[1].y = 4;
    expect(moves(g, g.pieces[1]).some((p) => p.x === 3)).toBe(false);
    g.pieces[1].kind = "knight";
    expect(moves(g, g.pieces[1]).some((p) => same(p, { x: 3, y: 4 }))).toBe(
      true,
    );
    expect(moves(g, g.pieces[1]).some((p) => p.x === 2)).toBe(false);
  });
  it("movement and attacks respect occupancy and diagonal geometry", () => {
    const g = arena();
    g.pieces[1].kind = "bishop";
    g.pieces[1].x = 3;
    g.pieces[1].y = 5;
    g.pieces[2].x = 4;
    g.pieces[2].y = 4;
    expect(attackSquares(g, g.pieces[1])).toContainEqual({ x: 4, y: 4 });
    expect(attackSquares(g, g.pieces[1])).not.toContainEqual({ x: 5, y: 3 });
    expect(attackSquares(g, g.pieces[1])).not.toContainEqual({ x: 3, y: 4 });
  });
  it("invalid commands do not mutate state", () => {
    const g = arena(),
      before = JSON.stringify(g);
    expect(move(g, "rook", { x: -1, y: 0 })).toBe(g);
    expect(attack(g, "enemy", "rook")).toBe(g);
    expect(JSON.stringify(g)).toBe(before);
  });
});
describe("effects and objectives", () => {
  it("preview equals resolved damage with protection and ward", () => {
    const g = arena();
    g.pieces.push(makePiece("pawn", "enemy", 2, 3, "guard"));
    g.pieces[2].ward = 2;
    const dmg = previewDamage(g, g.pieces[1], g.pieces[2]);
    expect(dmg).toBe(1);
    const next = attack(g, "rook", "enemy");
    expect(next.pieces.find((p) => p.id === "enemy")?.hp).toBe(
      g.pieces[2].hp - dmg,
    );
    expect(next.pieces.find((p) => p.id === "enemy")?.ward).toBe(0);
  });
  it("lethal damage awards material and Spoils heals the king once", () => {
    const g = arena();
    g.gambits = ["spoils"];
    g.pieces[0].hp = 7;
    g.pieces[2].hp = 2;
    const next = attack(g, "rook", "enemy");
    expect(next.material).toBe(1);
    expect(next.kingHp).toBe(8);
    expect(next.pieces.find((p) => p.id === "enemy")).toBeUndefined();
    expect(next.totalCaptures).toBe(1);
  });
  it("Blood Price accumulates on sacrifice and is consumed once", () => {
    const g = arena();
    g.gambits = ["blood-price"];
    g.pieces[1].hp = 1;
    g.turn = "enemy";
    const next = attack(g, "enemy", "rook");
    expect(next.blood).toBe(2);
    expect(next.material).toBe(-5);
    next.turn = "player";
    next.pieces[0].x = 1;
    next.pieces[0].y = 4;
    expect(previewDamage(next, next.pieces[0], next.pieces[1])).toBe(5);
    expect(attack(next, "king", "enemy").blood).toBe(0);
  });
  it("a prismatic bishop damages multiple enemies but stops at friendly pieces", () => {
    const g = arena();
    g.upgrades = ["sermon"];
    g.pieces = [
      g.pieces[0],
      makePiece("bishop", "player", 2, 5, "b"),
      makePiece("pawn", "enemy", 3, 4, "e1"),
      makePiece("pawn", "enemy", 4, 3, "e2"),
      makePiece("pawn", "player", 5, 2, "p"),
    ];
    expect(victims(g, g.pieces[1], g.pieces[2]).map((p) => p.id)).toEqual([
      "e1",
      "e2",
    ]);
    const n = attack(g, "b", "e1");
    expect(n.pieces.find((p) => p.id === "e1")?.hp).toBe(3);
    expect(n.pieces.find((p) => p.id === "e2")?.hp).toBe(3);
    expect(n.pieces.find((p) => p.id === "p")?.hp).toBe(6);
  });
  it("boss armor is supplied by adjacent guards", () => {
    const g = arena();
    g.floor = 5;
    g.pieces = [
      makePiece("king", "player", 7, 7, "king"),
      makePiece("queen", "player", 4, 2, "q"),
      makePiece("king", "enemy", 4, 0, "boss", 20),
      makePiece("rook", "enemy", 3, 0, "guard"),
    ];
    expect(previewDamage(g, g.pieces[1], g.pieces[2])).toBe(2);
    g.pieces.pop();
    expect(previewDamage(g, g.pieces[1], g.pieces[2])).toBe(4);
  });
  it("king death resolves immediately even with a completed material target", () => {
    const g = arena();
    g.turn = "enemy";
    g.material = 99;
    g.pieces[0].x = 1;
    g.pieces[0].y = 2;
    g.pieces[0].hp = 1;
    expect(attack(g, "enemy", "king").screen).toBe("defeat");
  });
  it("normal success is checked after the enemy phase, not mid-turn", () => {
    const g = arena();
    g.material = 3;
    expect(g.screen).toBe("battle");
    let n = endPhase(g);
    n.pieces.forEach((p) => (p.acted = true));
    n = endEnemyPhase(n);
    expect(n.screen).toBe("reward");
    expect(n.gold).toBe(g.gold + 32);
  });
  it("round deadline causes defeat when material target is unmet", () => {
    const g = arena();
    g.round = 5;
    g.turn = "enemy";
    g.pieces.forEach((p) => (p.acted = true));
    expect(endEnemyPhase(g).screen).toBe("defeat");
  });
  it("optional sacrifice is based on an actual friendly bishop death", () => {
    const g = arena();
    g.floor = 2;
    expect(bonusMet(g)).toBe(false);
    g.lost = ["bishop"];
    expect(bonusMet(g)).toBe(true);
  });
});
describe("consumables", () => {
  it("a trap swaps occupants once and cannot recurse", () => {
    const g = arena();
    g.inventory = ["trapdoor"];
    let n = useConsumable(g, 0, [
      { x: 2, y: 4 },
      { x: 1, y: 3 },
    ]);
    expect(n.consumed).toBe(true);
    expect(n.inventory).toEqual([]);
    n = move(n, "rook", { x: 2, y: 4 });
    expect(n.pieces.find((p) => p.id === "rook")).toMatchObject({ x: 1, y: 3 });
    expect(n.pieces.find((p) => p.id === "enemy")).toMatchObject({
      x: 2,
      y: 4,
    });
    expect(n.trap).toBeNull();
  });
  it("demolition cannot destroy an occupied tile or be used twice in a phase", () => {
    const g = arena();
    g.inventory = ["demolition", "repair"];
    expect(useConsumable(g, 0, [{ x: 1, y: 3 }])).toBe(g);
    const n = useConsumable(g, 0, [{ x: 3, y: 3 }]);
    expect(n.holes).toContainEqual({ x: 3, y: 3 });
    n.pieces[0].hp = 2;
    expect(useConsumable(n, 0, [n.pieces[0]])).toBe(n);
  });
  it("Veil fully blocks one hit and then expires", () => {
    const g = arena();
    g.inventory = ["smoke"];
    let n = useConsumable(g, 0, [{ x: 1, y: 4 }]);
    n.turn = "enemy";
    expect(previewDamage(n, n.pieces[2], n.pieces[1])).toBe(0);
    n = attack(n, "enemy", "rook");
    expect(n.pieces[1].hp).toBe(11);
    expect(n.pieces[1].veiled).toBe(false);
  });
  it("consumables cannot interrupt a moved piece activation", () => {
    const g = move(arena(), "rook", { x: 2, y: 4 });
    expect(useConsumable(g, 0, [g.pieces[0]])).toBe(g);
  });
});
describe("run and persistence", () => {
  it("normalizes the seed before creating its random stream", () => {
    expect(newGame("  ")).toEqual(newGame("BETWEEN-WORLDS"));
    expect(newGame(" A ")).toEqual(newGame("A"));
    expect(newGame("X".repeat(60))).toEqual(newGame("X".repeat(48)));
  });
  it("resumes an enemy phase without repeating completed activations", () => {
    const partial = enemyStep(endPhase(newGame()));
    let resumed = loadGame(JSON.stringify(partial))!;
    let uninterrupted = partial;
    for (let i = 0; i < 10 && resumed.turn === "enemy"; i++)
      resumed = enemyStep(resumed);
    for (let i = 0; i < 10 && uninterrupted.turn === "enemy"; i++)
      uninterrupted = enemyStep(uninterrupted);
    expect(resumed).toEqual(uninterrupted);
    expect(resumed.round).toBe(2);
  });
  it("same seed produces identical offers and enemy responses", () => {
    const a = newGame("TEST"),
      b = newGame("TEST");
    a.screen = "reward";
    b.screen = "reward";
    expect(openShop(a).offers).toEqual(openShop(b).offers);
    expect(enemyStep(endPhase(newGame("TEST")))).toEqual(
      enemyStep(endPhase(newGame("TEST"))),
    );
  });
  it("shop debits gold once and enforces capacity", () => {
    const g = arena();
    g.screen = "shop";
    g.gold = 100;
    g.offers = ["blood-price"];
    g.gambits = ["spoils", "phalanx", "momentum"];
    expect(buy(g, 0)).toBe(g);
    const n = buy(releaseGambit(g, "phalanx"), 0);
    expect(n.gold).toBe(78);
    expect(n.gambits).toContain("blood-price");
    expect(buy(n, 0)).toBe(n);
  });
  it("new battles restore troops but preserve king health, upgrades, and build", () => {
    const g = arena();
    g.screen = "shop";
    g.kingHp = 5;
    g.upgrades = ["sermon"];
    g.gambits = ["long-game"];
    const n = continueRun(g);
    expect(n.floor).toBe(1);
    expect(n.kingHp).toBe(5);
    expect(n.pieces.find((p) => p.kind === "king")?.hp).toBe(5);
    expect(n.pieces.find((p) => p.kind === "bishop")?.hp).toBe(6);
    expect(n.upgrades).toEqual(["sermon"]);
    expect(n.gambits).toEqual(["long-game"]);
  });
  it("the interstitial event happens once and cannot kill the king", () => {
    const g = arena();
    g.screen = "shop";
    g.floor = 2;
    g.kingHp = 2;
    const e = continueRun(g);
    expect(e.screen).toBe("event");
    const n = chooseEvent(e, "gold");
    expect(n.floor).toBe(3);
    expect(n.kingHp).toBe(1);
    expect(n.gold).toBe(g.gold + 20);
    expect(n.eventTaken).toBe(true);
  });
  it("saves round-trip and reject invalid or outdated data", () => {
    const g = newGame();
    expect(loadGame(JSON.stringify(g))).toEqual(g);
    expect(loadGame("bad")).toBeNull();
    expect(loadGame(JSON.stringify({ ...g, version: 9 }))).toBeNull();
    expect(
      loadGame(JSON.stringify({ ...g, pieces: [{ kind: "dragon", x: 99 }] })),
    ).toBeNull();
  });
});
