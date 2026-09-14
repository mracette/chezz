import {
  PIECES,
  ENCOUNTERS,
  STARTERS,
  SETS,
  GAMBITS,
  UPGRADES,
  CONSUMABLES,
  HEAL,
  itemById,
} from "./content";
import type {
  Kind,
  Side,
  Pos,
  GambitId,
  UpgradeId,
  ConsumableId,
  Item,
} from "./content";
export type Piece = Pos & {
  id: string;
  kind: Kind;
  side: Side;
  hp: number;
  maxHp: number;
  moved: boolean;
  acted: boolean;
  ward: number;
  veiled: boolean;
};
export type Game = {
  version: 1;
  rulesVersion: 2;
  seed: string;
  rng: number;
  set: string;
  floor: number;
  round: number;
  screen: "battle" | "reward" | "shop" | "event" | "victory" | "defeat";
  turn: Side;
  pieces: Piece[];
  holes: Pos[];
  trap: [Pos, Pos] | null;
  active: string | null;
  undo?: {
    pieceId: string;
    pieces: Piece[];
    trap: [Pos, Pos] | null;
    log: string[];
  };
  gold: number;
  kingHp: number;
  kingMax: number;
  gambits: GambitId[];
  upgrades: UpgradeId[];
  inventory: ConsumableId[];
  material: number;
  lost: Kind[];
  kills: Kind[];
  blood: number;
  firstAttack: boolean;
  consumed: boolean;
  log: string[];
  serial: number;
  offers: string[];
  bought: number[];
  reward: number;
  bonusEarned: boolean;
  eventTaken: boolean;
  totalCaptures: number;
  totalRounds: number;
  history: string[];
};
export const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
export const distance = (a: Pos, b: Pos) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const inside = (p: Pos) => p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 8;
export const coord = (p: Pos) => "abcdefgh"[p.x] + (8 - p.y);
export const pieceAt = (g: Game, p: Pos) => g.pieces.find((u) => same(u, p));
export const isHole = (g: Game, p: Pos) => g.holes.some((h) => same(h, p));
export const has = (g: Game, id: string) =>
  (g.gambits as string[]).includes(id);
export const upgraded = (g: Game, p: Piece) =>
  p.side === "player" &&
  UPGRADES.some(
    (u) => u.kind === p.kind && (g.upgrades as string[]).includes(u.id),
  );
export function hashSeed(seed: string) {
  let n = 2166136261;
  for (const c of seed) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
function random(g: Game) {
  let x = g.rng;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  g.rng = x >>> 0 || 1;
  return g.rng / 4294967296;
}
function log(g: Game, s: string) {
  g.log = [s, ...g.log].slice(0, 35);
}
function record(g: Game, s: string) {
  g.history.push(s);
  g.serial++;
}
export function makePiece(
  kind: Kind,
  side: Side,
  x: number,
  y: number,
  id: string,
  hp?: number,
): Piece {
  const maxHp = hp ?? PIECES[kind].hp;
  return {
    kind,
    side,
    x,
    y,
    id,
    hp: maxHp,
    maxHp,
    moved: false,
    acted: false,
    ward: 0,
    veiled: false,
  };
}
export function newGame(seed = "BETWEEN-WORLDS", set = "mahogany"): Game {
  const s = SETS.find((s) => s.id === set) ?? SETS[0];
  const normalizedSeed = seed.trim().slice(0, 48) || "BETWEEN-WORLDS";
  const g: Game = {
    version: 1,
    rulesVersion: 2,
    seed: normalizedSeed,
    rng: hashSeed(normalizedSeed) || 1,
    set: s.id,
    floor: 0,
    round: 1,
    screen: "battle",
    turn: "player",
    pieces: [],
    holes: [],
    trap: null,
    active: null,
    gold: s.gold,
    kingHp: s.hp,
    kingMax: s.hp,
    gambits: [s.gambit],
    upgrades: [],
    inventory: ["repair", "demolition"],
    material: 0,
    lost: [],
    kills: [],
    blood: 0,
    firstAttack: true,
    consumed: false,
    log: [],
    serial: 0,
    offers: [],
    bought: [],
    reward: 0,
    bonusEarned: false,
    eventTaken: false,
    totalCaptures: 0,
    totalRounds: 0,
    history: [],
  };
  startBattle(g);
  return g;
}
function startBattle(g: Game) {
  const e = ENCOUNTERS[g.floor];
  g.pieces = STARTERS.map(([k, x, y], i) => {
    let hp = k === "king" ? g.kingMax : PIECES[k].hp;
    if (k === "queen" && has(g, "queens-gambit")) hp += 4;
    if (k === "pawn" && g.upgrades.includes("ascension")) hp += 2;
    const p = makePiece(k, "player", x, y, "p" + i, hp);
    if (k === "king") p.hp = g.kingHp;
    return p;
  });
  e.enemies.forEach(([k, x, y], i) =>
    g.pieces.push(
      makePiece(
        k,
        "enemy",
        x,
        y,
        "e" + i,
        k === "king" ? e.kingHp : PIECES[k].hp + (e.boss ? 1 : 0),
      ),
    ),
  );
  g.holes = structuredClone(e.holes);
  g.trap = null;
  g.round = 1;
  g.turn = "player";
  g.active = null;
  delete g.undo;
  g.material = 0;
  g.lost = [];
  g.kills = [];
  g.blood = 0;
  g.firstAttack = true;
  g.consumed = false;
  g.screen = "battle";
  g.log = [];
  g.bought = [];
  log(g, e.description);
  record(g, "Battle " + (g.floor + 1));
}
export function moves(g: Game, p: Piece): Pos[] {
  if (p.moved || p.acted) return [];
  const range = PIECES[p.kind].move;
  if (p.kind === "knight") {
    const out: Pos[] = [];
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        if (
          distance(p, { x, y }) <= range &&
          distance(p, { x, y }) > 0 &&
          !pieceAt(g, { x, y }) &&
          !isHole(g, { x, y })
        )
          out.push({ x, y });
    return out;
  }
  const out: Pos[] = [];
  const seen = new Set([p.x + "," + p.y]);
  const queue = [{ x: p.x, y: p.y, d: 0 }];
  while (queue.length) {
    const at = queue.shift()!;
    if (at.d >= range) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: at.x + dx, y: at.y + dy };
      const key = n.x + "," + n.y;
      if (!inside(n) || seen.has(key) || isHole(g, n) || pieceAt(g, n))
        continue;
      seen.add(key);
      out.push(n);
      queue.push({ ...n, d: at.d + 1 });
    }
  }
  return out;
}
export function movementPath(g: Game, p: Piece, to: Pos): Pos[] {
  if (!moves(g, p).some((q) => same(q, to))) return [];
  if (p.kind === "knight") return [{ x: p.x, y: p.y }, to];
  const queue: { pos: Pos; path: Pos[] }[] = [
      { pos: p, path: [{ x: p.x, y: p.y }] },
    ],
    seen = new Set([coord(p)]);
  while (queue.length) {
    const { pos, path } = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { x: pos.x + dx, y: pos.y + dy };
      if (
        !inside(next) ||
        seen.has(coord(next)) ||
        isHole(g, next) ||
        pieceAt(g, next)
      )
        continue;
      const nextPath = [...path, next];
      if (same(next, to)) return nextPath;
      seen.add(coord(next));
      queue.push({ pos: next, path: nextPath });
    }
  }
  return [];
}
export function attackSquares(g: Game, p: Piece, ignoreActed = false): Pos[] {
  if (p.acted && !ignoreActed) return [];
  const dirs =
    p.kind === "bishop"
      ? [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]
      : p.kind === "queen"
        ? [
            [1, 1],
            [1, -1],
            [-1, 1],
            [-1, -1],
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]
        : [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
  const out: Pos[] = [];
  for (const [dx, dy] of dirs)
    for (let d = 1; d <= PIECES[p.kind].range; d++) {
      const q = { x: p.x + dx * d, y: p.y + dy * d };
      if (!inside(q) || isHole(g, q)) break;
      const u = pieceAt(g, q);
      out.push(q);
      if (u) break;
    }
  return out;
}
export function targets(g: Game, p: Piece) {
  const squares = attackSquares(g, p);
  return g.pieces.filter(
    (t) => t.side !== p.side && squares.some((s) => same(s, t)),
  );
}
// Distance to a square this piece can attack from, accounting for obstacles.
export function attackDistances(g: Game, p: Piece): Map<string, number> {
  const board = { ...g, pieces: g.pieces.filter((u) => u.id !== p.id) };
  const cells = Array.from({ length: 64 }, (_, i) => ({
    x: i % 8,
    y: Math.floor(i / 8),
  })).filter((q) => !isHole(g, q) && !pieceAt(board, q));
  const distances = new Map<string, number>();
  const queue: Pos[] = [];
  for (const q of cells) {
    if (
      attackSquares(board, { ...p, ...q }, true).some((t) => {
        const target = pieceAt(board, t);
        return target && target.side !== p.side;
      })
    ) {
      distances.set(coord(q), 0);
      queue.push(q);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const at = queue[i];
    for (const q of cells) {
      const d = distance(at, q);
      if (distances.has(coord(q)) || (p.kind === "knight" ? d > 3 : d !== 1))
        continue;
      distances.set(coord(q), distances.get(coord(at))! + 1);
      queue.push(q);
    }
  }
  return distances;
}
export type DangerSquare = Pos & { attackers: string[] };
export function dangerSquares(g: Game): DangerSquare[] {
  const danger = new Map<string, DangerSquare>();
  for (const enemy of g.pieces.filter((p) => p.side === "enemy")) {
    const ready: Game = {
      ...g,
      turn: "enemy",
      active: null,
      pieces: g.pieces.map((p) =>
        p.id === enemy.id ? { ...p, moved: false, acted: false } : p,
      ),
    };
    const unit = ready.pieces.find((p) => p.id === enemy.id)!;
    const covered = new Set<string>();
    for (const destination of [unit, ...moves(ready, unit)]) {
      const simulation = same(destination, unit)
        ? ready
        : move(ready, unit.id, destination);
      const attacker = simulation.pieces.find((p) => p.id === unit.id)!;
      for (const square of attackSquares(simulation, attacker)) {
        if (pieceAt(simulation, square)?.side === "enemy") continue;
        const key = coord(square);
        if (covered.has(key)) continue;
        covered.add(key);
        const entry = danger.get(key) ?? { ...square, attackers: [] };
        entry.attackers.push(enemy.id);
        danger.set(key, entry);
      }
    }
  }
  return [...danger.values()];
}
function power(g: Game, p: Piece, t: Piece) {
  let n = PIECES[p.kind].atk;
  if (p.side === "player") {
    if (p.kind === "pawn" && g.upgrades.includes("ascension")) n++;
    if (has(g, "blood-price")) n += g.blood;
    if (has(g, "momentum") && g.firstAttack) n++;
    if (
      has(g, "long-game") &&
      Math.max(Math.abs(p.x - t.x), Math.abs(p.y - t.y)) >= 3
    )
      n++;
    if (has(g, "resonance") && upgraded(g, p)) n++;
    if (has(g, "fractured-crown") && p.kind === "king" && p.hp <= p.maxHp / 2)
      n += 2;
  }
  return n;
}
function protection(g: Game, t: Piece) {
  let armor = 0;
  for (const ally of g.pieces)
    if (ally.id !== t.id && ally.side === t.side && distance(ally, t) === 1) {
      if (ally.kind === "pawn")
        armor = Math.max(
          armor,
          t.side === "player" && has(g, "phalanx") ? 2 : 1,
        );
      if (ally.kind === "king") armor = Math.max(armor, 1);
      if (t.kind === "king" && t.side === "enemy" && ENCOUNTERS[g.floor].boss)
        armor = Math.max(armor, 2);
    }
  return armor;
}
export function previewDamage(g: Game, p: Piece, t: Piece) {
  return t.veiled ? 0 : Math.max(1, power(g, p, t) - protection(g, t) - t.ward);
}
export function victims(g: Game, p: Piece, t: Piece): Piece[] {
  if (
    p.kind !== "bishop" ||
    p.side !== "player" ||
    !g.upgrades.includes("sermon")
  )
    return [t];
  const out: Piece[] = [];
  const dx = Math.sign(t.x - p.x),
    dy = Math.sign(t.y - p.y);
  for (let d = 1; d <= 3; d++) {
    const pos = { x: p.x + dx * d, y: p.y + dy * d };
    if (!inside(pos) || isHole(g, pos)) break;
    const u = pieceAt(g, pos);
    if (u?.side === p.side) break;
    if (u) out.push(u);
  }
  return out;
}
function terminal(g: Game) {
  const king = g.pieces.find((p) => p.kind === "king" && p.side === "player");
  g.kingHp = king?.hp ?? 0;
  if (!king) {
    g.screen = "defeat";
    g.active = null;
    log(g, "Your king has no health left. Run ended.");
    return true;
  }
  if (!g.pieces.some((p) => p.kind === "king" && p.side === "enemy")) {
    win(g);
    return true;
  }
  return false;
}
function hit(g: Game, p: Piece, t: Piece, raw: number) {
  if (t.veiled) {
    t.veiled = false;
    log(g, PIECES[t.kind].name + " blocks the hit with Veil.");
    return;
  }
  const dmg = Math.max(1, raw - protection(g, t) - t.ward);
  t.ward = 0;
  t.hp -= dmg;
  log(
    g,
    PIECES[p.kind].name + " → " + PIECES[t.kind].name + " · " + dmg + " damage",
  );
  if (t.hp <= 0) {
    g.pieces = g.pieces.filter((u) => u.id !== t.id);
    if (t.side === "enemy") {
      g.material += PIECES[t.kind].value;
      g.kills.push(p.kind);
      g.totalCaptures++;
      if (has(g, "spoils")) {
        const king = g.pieces.find(
          (u) => u.side === "player" && u.kind === "king",
        );
        if (king) king.hp = Math.min(king.maxHp, king.hp + 1);
      }
    } else {
      g.material -= PIECES[t.kind].value;
      g.lost.push(t.kind);
      if (has(g, "blood-price")) {
        g.blood += 2;
        log(g, "Blood Price · your next attack gains 2 damage.");
      }
    }
    log(
      g,
      PIECES[t.kind].name +
        " captured" +
        (t.kind === "king"
          ? ""
          : " · " +
            (t.side === "enemy" ? "+" : "−") +
            PIECES[t.kind].value +
            " material"),
    );
  }
}
function triggerTrap(g: Game, p: Piece) {
  if (!g.trap) return;
  const index = g.trap.findIndex((t) => same(t, p));
  if (index < 0) return;
  const origin = { x: p.x, y: p.y },
    destination = g.trap[1 - index];
  const other = pieceAt(g, destination);
  p.x = destination.x;
  p.y = destination.y;
  if (other) {
    other.x = origin.x;
    other.y = origin.y;
  }
  g.trap = null;
  log(
    g,
    "Trapdoor triggered. " +
      PIECES[p.kind].name +
      " moved to " +
      coord(p) +
      ".",
  );
}
export function move(g0: Game, id: string, to: Pos): Game {
  const g = structuredClone(g0),
    p = g.pieces.find((p) => p.id === id);
  if (
    g.screen !== "battle" ||
    !p ||
    p.side !== g.turn ||
    (g.active && g.active !== id) ||
    !moves(g, p).some((q) => same(q, to))
  )
    return g0;
  if (p.side === "player")
    g.undo = {
      pieceId: id,
      pieces: structuredClone(g0.pieces),
      trap: structuredClone(g0.trap),
      log: [...g0.log],
    };
  p.x = to.x;
  p.y = to.y;
  p.moved = true;
  g.active = id;
  if (
    p.side === "player" &&
    p.kind === "rook" &&
    g.upgrades.includes("bulwark")
  )
    p.ward = 2;
  triggerTrap(g, p);
  log(g, PIECES[p.kind].name + " moves to " + coord(p));
  record(g, id + " move " + coord(to));
  return g;
}
export function undoMove(g0: Game): Game {
  if (
    g0.screen !== "battle" ||
    g0.turn !== "player" ||
    !g0.undo ||
    g0.active !== g0.undo.pieceId
  )
    return g0;
  const active = g0.pieces.find((p) => p.id === g0.active);
  if (!active?.moved || active.acted) return g0;
  const g = structuredClone(g0);
  g.pieces = g.undo!.pieces;
  g.trap = g.undo!.trap;
  g.log = g.undo!.log;
  g.active = null;
  delete g.undo;
  record(g, "Undo move " + active.id);
  return g;
}
export function attack(g0: Game, id: string, targetId: string): Game {
  const g = structuredClone(g0),
    p = g.pieces.find((p) => p.id === id),
    t = g.pieces.find((p) => p.id === targetId);
  if (
    g.screen !== "battle" ||
    !p ||
    !t ||
    p.side !== g.turn ||
    (g.active && g.active !== id) ||
    !targets(g, p).some((q) => q.id === targetId)
  )
    return g0;
  const list = victims(g, p, t).map((u) => ({ u, raw: power(g, p, u) }));
  if (p.side === "player") {
    g.firstAttack = false;
    g.blood = 0;
  }
  for (const { u, raw } of list) hit(g, p, u, raw);
  if (p.kind === "knight" && p.side === "player" && g.upgrades.includes("fork"))
    for (const u of [...g.pieces])
      if (u.side !== p.side && u.id !== t.id && distance(p, u) === 1)
        hit(g, p, u, 1);
  if (p.kind === "rook" && t.hp > 0) {
    const to = { x: t.x + Math.sign(t.x - p.x), y: t.y + Math.sign(t.y - p.y) };
    if (inside(to) && !isHole(g, to) && !pieceAt(g, to)) {
      t.x = to.x;
      t.y = to.y;
      triggerTrap(g, t);
      log(g, "Rook displaces its target.");
    }
  }
  p.acted = true;
  p.moved = true;
  g.active = null;
  delete g.undo;
  record(g, id + " attack " + targetId);
  terminal(g);
  return g;
}
export function waitPiece(g0: Game, id: string): Game {
  const p0 = g0.pieces.find((p) => p.id === id);
  if (
    g0.screen !== "battle" ||
    !p0 ||
    p0.side !== g0.turn ||
    p0.acted ||
    (g0.active && g0.active !== id)
  )
    return g0;
  const g = structuredClone(g0),
    p = g.pieces.find((p) => p.id === id)!;
  p.acted = true;
  p.moved = true;
  g.active = null;
  delete g.undo;
  record(g, id + " wait");
  return g;
}
export function bonusMet(g: Game) {
  switch (ENCOUNTERS[g.floor].bonusId) {
    case "no-loss":
      return g.lost.length === 0;
    case "bishop-kill":
      return g.kills.includes("bishop");
    case "knight-kill":
      return g.kills.includes("knight");
    case "sacrifice":
      return g.lost.includes("bishop");
    case "queen-alive":
      return g.pieces.some((p) => p.kind === "queen" && p.side === "player");
    case "king-health":
      return g.kingHp > g.kingMax / 2;
    default:
      return false;
  }
}
function win(g: Game) {
  g.bonusEarned = bonusMet(g);
  g.reward = ENCOUNTERS[g.floor].reward + (g.bonusEarned ? 12 : 0);
  g.gold += g.reward;
  g.active = null;
  g.screen = ENCOUNTERS[g.floor].boss ? "victory" : "reward";
  log(g, "Enemy king captured. " + g.reward + " gold earned.");
}
export function endPhase(g0: Game): Game {
  if (g0.screen !== "battle" || g0.turn !== "player") return g0;
  const g = structuredClone(g0);
  g.active = null;
  g.turn = "enemy";
  delete g.undo;
  for (const p of g.pieces) {
    if (p.side === "player") {
      p.acted = true;
      p.moved = true;
    } else {
      p.acted = false;
      p.moved = false;
    }
  }
  log(g, "Enemy turn.");
  record(g, "End player phase");
  return g;
}
export function endEnemyPhase(g0: Game): Game {
  if (
    g0.screen !== "battle" ||
    g0.turn !== "enemy" ||
    g0.pieces.some((p) => p.side === "enemy" && !p.acted)
  )
    return g0;
  const g = structuredClone(g0);
  g.totalRounds++;
  if (terminal(g)) return g;
  g.round++;
  g.turn = "player";
  g.active = null;
  g.consumed = false;
  g.firstAttack = true;
  for (const p of g.pieces)
    if (p.side === "player") {
      p.moved = false;
      p.acted = false;
      p.veiled = false;
    }
  log(g, "Round " + g.round + " · your army is ready.");
  record(g, "Round " + g.round);
  return g;
}
export function useConsumable(g0: Game, index: number, positions: Pos[]): Game {
  if (
    g0.screen !== "battle" ||
    g0.turn !== "player" ||
    g0.consumed ||
    g0.active
  )
    return g0;
  const id = g0.inventory[index];
  if (!id) return g0;
  const g = structuredClone(g0),
    a = positions[0],
    b = positions[1];
  if (!a || !inside(a)) return g0;
  if (id === "demolition") {
    if (pieceAt(g, a) || isHole(g, a) || g.trap?.some((t) => same(t, a)))
      return g0;
    g.holes.push(a);
  } else if (id === "trapdoor") {
    if (
      !b ||
      !inside(b) ||
      same(a, b) ||
      isHole(g, a) ||
      isHole(g, b) ||
      g.trap
    )
      return g0;
    g.trap = [a, b];
  } else {
    const p = pieceAt(g, a);
    if (!p || p.side !== "player") return g0;
    if (id === "repair") {
      if (p.hp === p.maxHp) return g0;
      p.hp = Math.min(p.maxHp, p.hp + 4);
    } else p.veiled = true;
  }
  g.inventory.splice(index, 1);
  g.consumed = true;
  g.kingHp = g.pieces.find((p) => p.kind === "king" && p.side === "player")!.hp;
  log(g, itemById(id).name + " used.");
  record(g, "Use " + id + " " + positions.map(coord).join(" "));
  return g;
}
export function enemyStep(g0: Game): Game {
  if (g0.turn !== "enemy" || g0.screen !== "battle") return g0;
  const available = g0.pieces.filter((p) => p.side === "enemy" && !p.acted);
  if (!available.length) return endEnemyPhase(g0);
  // Evaluate one activation at a time, always using the current board.
  let best:
    { score: number; id: string; pos: Pos; target?: string } | undefined;
  const allies = g0.pieces.filter((p) => p.side === "player");
  for (const p of available) {
    const approach = attackDistances(g0, p);
    const choices = [{ x: p.x, y: p.y }, ...moves(g0, p)];
    for (const pos of choices) {
      const sim = same(pos, p) ? g0 : move(g0, p.id, pos),
        sp = sim.pieces.find((u) => u.id === p.id)!;
      const ts = targets(sim, sp);
      let score = -(approach.get(coord(sp)) ?? 64) * 0.3;
      let target: string | undefined;
      for (const t of ts) {
        const dmg = previewDamage(sim, sp, t);
        const s =
          dmg * 2 +
          (dmg >= t.hp ? PIECES[t.kind].value * 1.5 + 7 : 0) +
          (t.kind === "king" ? (dmg >= t.hp ? 50 : 3) : 0);
        if (!target || s > score) {
          score = s;
          target = t.id;
        }
      }
      if (p.kind === "king") {
        // Kings may fight, but avoid trading their life for an ordinary capture.
        const danger = allies.reduce(
          (sum, ally) =>
            sum +
            (attackSquares(sim, ally, true).some((q) => same(q, sp))
              ? PIECES[ally.kind].atk
              : 0),
          0,
        );
        score -= danger * 2;
        if (g0.pieces.filter((u) => u.side === "enemy").length > 1)
          score -=
            Math.max(0, 3 - Math.min(...allies.map((u) => distance(sp, u)))) *
            2;
      }
      if (ENCOUNTERS[g0.floor].boss && p.kind === "rook") {
        const king = sim.pieces.find(
          (u) => u.side === "enemy" && u.kind === "king",
        );
        if (king && distance(sp, king) > 1) score -= 5;
      }
      if (!same(pos, p)) score -= 0.05;
      if (!best || score > best.score) best = { score, id: p.id, pos, target };
    }
  }
  if (!best) return g0;
  let g = g0;
  const p = g.pieces.find((u) => u.id === best!.id)!;
  if (!same(p, best.pos)) g = move(g, p.id, best.pos);
  if (best.target) g = attack(g, p.id, best.target);
  else g = waitPiece(g, p.id);
  return g;
}
export function openShop(g0: Game): Game {
  if (g0.screen !== "reward") return g0;
  const g = structuredClone(g0);
  g.screen = "shop";
  g.bought = [];
  const gs = GAMBITS.filter((i) => !(g.gambits as string[]).includes(i.id));
  const us = UPGRADES.filter((i) => !(g.upgrades as string[]).includes(i.id));
  const pick = (a: Item[]) => a[Math.floor(random(g) * a.length)];
  const first = pick(gs);
  const second = pick(gs.filter((i) => i.id !== first?.id));
  g.offers = [
    first?.id,
    second?.id,
    pick(us)?.id,
    pick(CONSUMABLES).id,
    HEAL.id,
  ].filter(Boolean) as string[];
  record(g, "Open shop");
  return g;
}
export function purchaseReason(g: Game, index: number) {
  const item = itemById(g.offers[index]);
  if (!item) return "Unavailable";
  if (g.bought.includes(index)) return "Acquired";
  if (g.gold < item.price) return "Not enough gold";
  if (item.type === "gambit" && g.gambits.length >= 3)
    return "Release a gambit first";
  if (item.type === "consumable" && g.inventory.length >= 2)
    return "Inventory full";
  if (item.type === "heal" && g.kingHp >= g.kingMax)
    return "King at full health";
  return "";
}
export function buy(g0: Game, index: number): Game {
  if (g0.screen !== "shop" || purchaseReason(g0, index)) return g0;
  const g = structuredClone(g0),
    item = itemById(g.offers[index]);
  g.gold -= item.price;
  g.bought.push(index);
  if (item.type === "gambit") g.gambits.push(item.id as GambitId);
  if (item.type === "upgrade") g.upgrades.push(item.id as UpgradeId);
  if (item.type === "consumable") g.inventory.push(item.id as ConsumableId);
  if (item.type === "heal") g.kingHp = Math.min(g.kingMax, g.kingHp + 5);
  record(g, "Buy " + item.id);
  return g;
}
export function releaseGambit(g0: Game, id: GambitId): Game {
  if (g0.screen !== "shop" || !g0.gambits.includes(id)) return g0;
  const g = structuredClone(g0);
  g.gambits = g.gambits.filter((i) => i !== id);
  record(g, "Release " + id);
  return g;
}
export function discardConsumable(g0: Game, index: number): Game {
  if (g0.screen !== "shop") return g0;
  const g = structuredClone(g0);
  g.inventory.splice(index, 1);
  record(g, "Discard consumable");
  return g;
}
export function continueRun(g0: Game): Game {
  if (g0.screen !== "shop") return g0;
  const g = structuredClone(g0);
  if (g.floor === 2 && !g.eventTaken) {
    g.screen = "event";
    return g;
  }
  g.floor++;
  startBattle(g);
  return g;
}
export function chooseEvent(g0: Game, choice: "heal" | "gold"): Game {
  if (g0.screen !== "event") return g0;
  const g = structuredClone(g0);
  if (choice === "heal") g.kingHp = Math.min(g.kingMax, g.kingHp + 5);
  else {
    g.kingHp = Math.max(1, g.kingHp - 3);
    g.gold += 20;
  }
  g.eventTaken = true;
  record(g, "Event " + choice);
  g.floor++;
  startBattle(g);
  return g;
}
export function loadGame(raw: string | null): Game | null {
  if (!raw) return null;
  try {
    const g = JSON.parse(raw) as Game;
    if (
      g.version !== 1 ||
      !Number.isInteger(g.floor) ||
      g.floor < 0 ||
      g.floor >= 6 ||
      !Array.isArray(g.pieces) ||
      !Array.isArray(g.gambits) ||
      !Array.isArray(g.inventory) ||
      !Array.isArray(g.history) ||
      !Array.isArray(g.upgrades) ||
      !Array.isArray(g.holes) ||
      !Array.isArray(g.log) ||
      !Array.isArray(g.offers) ||
      !Array.isArray(g.bought) ||
      !Array.isArray(g.lost) ||
      !Array.isArray(g.kills)
    )
      return null;
    if (
      !["battle", "reward", "shop", "event", "victory", "defeat"].includes(
        g.screen,
      ) ||
      !["player", "enemy"].includes(g.turn) ||
      typeof g.seed !== "string" ||
      !Number.isFinite(g.kingHp) ||
      !Number.isFinite(g.gold) ||
      !Number.isFinite(g.round)
    )
      return null;
    if (
      g.pieces.some(
        (p) =>
          !PIECES[p.kind] ||
          !inside(p) ||
          !Number.isFinite(p.hp) ||
          !Number.isFinite(p.maxHp),
      )
    )
      return null;
    if (
      [...g.gambits, ...g.inventory, ...g.upgrades, ...g.offers].some(
        (id) => !itemById(id),
      )
    )
      return null;
    if (g.rulesVersion !== 2) {
      if (
        g.screen === "battle" &&
        !g.pieces.some((p) => p.side === "enemy" && p.kind === "king")
      ) {
        const encounter = ENCOUNTERS[g.floor];
        const spawn = encounter.enemies.find(([kind]) => kind === "king")!;
        const candidates = Array.from({ length: 64 }, (_, i) => ({
          x: i % 8,
          y: Math.floor(i / 8),
        }))
          .filter((p) => !pieceAt(g, p) && !isHole(g, p))
          .sort(
            (a, b) =>
              distance(a, { x: spawn[1], y: spawn[2] }) -
              distance(b, { x: spawn[1], y: spawn[2] }),
          );
        const pos = candidates[0];
        if (!pos) return null;
        g.pieces.push(
          makePiece(
            "king",
            "enemy",
            pos.x,
            pos.y,
            "enemy-king-v2",
            encounter.kingHp,
          ),
        );
        log(g, "Updated objective: capture the enemy king.");
      }
      delete g.undo;
      g.rulesVersion = 2;
    }
    return g;
  } catch {
    return null;
  }
}
