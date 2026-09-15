export type Side = "white" | "black";
export type Kind = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type Pos = { x: number; y: number };
export type Unit = Pos & { id: string; side: Side; kind: Kind; hp: number };
export type Order = { unitId: string; to: Pos };
export type Game = { units: Unit[]; planned: Order[]; cleanupTargets: string[]; turn: number; log: string[]; winner: Side | null };

export const HP: Record<Kind, number> = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 5 };
export const ICON: Record<Side, Record<Kind, string>> = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};
export const name = (p: Pos) => "abcdefgh"[p.x] + (8 - p.y);
export const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
const inside = (p: Pos) => p.x >= 0 && p.x < 8 && p.y >= 0 && p.y < 8;
export const at = (g: Game, p: Pos) => g.units.find((u) => same(u, p));
const unit = (g: Game, id: string) => g.units.find((u) => u.id === id);

// An advanced, symmetric six-piece position. Immediate tensions make the
// simultaneous rules legible on turn one without a long opening march.
const setup: [Kind, number, number][] = [
  ["king", 4, 7], ["queen", 3, 5], ["rook", 0, 6],
  ["bishop", 2, 4], ["knight", 5, 5], ["pawn", 4, 4],
];
export function newGame(): Game {
  const units: Unit[] = [];
  setup.forEach(([kind, x, y], i) => units.push({ id: `w${i}`, side: "white", kind, x, y, hp: HP[kind] }));
  setup.forEach(([kind, x, y], i) => units.push({ id: `b${i}`, side: "black", kind, x, y: 7 - y, hp: HP[kind] }));
  return { units, planned: [], cleanupTargets: [], turn: 1, log: ["Plan up to three white orders, then resolve simultaneously."], winner: null };
}

function rays(g: Game, u: Unit, dirs: number[][]) {
  const out: Pos[] = [];
  for (const [dx, dy] of dirs) for (let d = 1; d < 8; d++) {
    const p = { x: u.x + dx * d, y: u.y + dy * d };
    if (!inside(p)) break;
    const occupant = at(g, p);
    if (!occupant) out.push(p);
    else { if (occupant.side !== u.side) out.push(p); break; }
  }
  return out;
}
export function legal(g: Game, u: Unit): Pos[] {
  const empty = (p: Pos) => inside(p) && !at(g, p);
  if (u.kind === "pawn") {
    const dy = u.side === "white" ? -1 : 1, out: Pos[] = [];
    const forward = { x: u.x, y: u.y + dy };
    if (empty(forward)) out.push(forward);
    for (const dx of [-1, 1]) {
      const p = { x: u.x + dx, y: u.y + dy }, target = at(g, p);
      // A diagonal pawn order can be a normal capture or a held attack. An
      // empty diagonal is not a move: the pawn waits and strikes only if an
      // enemy chooses that square during simultaneous resolution.
      if (inside(p) && (!target || target.side !== u.side)) out.push(p);
    }
    return out;
  }
  if (u.kind === "knight") return [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]
    .map(([x,y]) => ({ x: u.x + x, y: u.y + y })).filter(p => inside(p) && at(g,p)?.side !== u.side);
  if (u.kind === "king") return [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
    .map(([x,y]) => ({ x: u.x + x, y: u.y + y })).filter(p => inside(p) && at(g,p)?.side !== u.side);
  const orthogonal = [[1,0],[-1,0],[0,1],[0,-1]], diagonal = [[1,1],[1,-1],[-1,1],[-1,-1]];
  return rays(g, u, u.kind === "rook" ? orthogonal : u.kind === "bishop" ? diagonal : [...orthogonal, ...diagonal]);
}
export function queue(g: Game, order: Order): Game {
  if (g.winner || g.cleanupTargets.length || g.planned.length >= 3 || g.planned.some(o => o.unitId === order.unitId || same(o.to, order.to))) return g;
  const u = unit(g, order.unitId);
  if (!u || u.side !== "white" || !legal(g, u).some(p => same(p, order.to))) return g;
  return { ...g, planned: [...g.planned, order] };
}
export function isPawnAmbush(g: Game, u: Unit, to: Pos) {
  return u.kind === "pawn" && Math.abs(to.x - u.x) === 1 && !at(g, to);
}
export function removeOrder(g: Game, index: number): Game { return { ...g, planned: g.planned.filter((_, i) => i !== index) }; }
export function declineCleanup(g: Game): Game {
  return g.cleanupTargets.length ? { ...g, cleanupTargets: [], log: ["You decline the cleanup opportunity.", ...g.log] } : g;
}
export function cleanup(g: Game, attackerId: string, targetId: string): Game {
  if (!g.cleanupTargets.includes(targetId) || g.winner) return g;
  const attacker = unit(g, attackerId), target = unit(g, targetId);
  if (!attacker || !target || attacker.side !== "white" || target.side !== "black" || !legal(g, attacker).some(p => same(p, target))) return g;
  const units = g.units.map(u => ({ ...u })), a = units.find(u => u.id === attackerId)!, t = units.find(u => u.id === targetId)!;
  t.hp -= a.hp;
  let log: string;
  if (t.hp <= 0) {
    const index = units.findIndex(u => u.id === t.id); units.splice(index, 1);
    a.x = t.x; a.y = t.y;
    log = `${label(a)} cleans up ${label(t)} at ${name(a)}.`;
  } else log = `${label(a)} damages ${label(t)} from safety. ${label(t)} has ${t.hp} HP left.`;
  const winner: Side | null = !units.some(u => u.side === "black" && u.kind === "king") ? "white" : null;
  return { ...g, units, cleanupTargets: [], winner, log: [log, ...g.log] };
}

function distance(a: Pos, b: Pos) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function enemyOrders(g: Game): Order[] {
  const choices: { order: Order; score: number }[] = [];
  const whiteKing = g.units.find(u => u.side === "white" && u.kind === "king")!;
  for (const u of g.units.filter(u => u.side === "black")) for (const to of legal(g, u)) {
    if (isPawnAmbush(g, u, to)) continue;
    const target = at(g, to);
    choices.push({ order: { unitId: u.id, to }, score: target?.side === "white" ? 100 + HP[target.kind] : -distance(to, whiteKing) });
  }
  choices.sort((a,b) => b.score - a.score || a.order.unitId.localeCompare(b.order.unitId));
  const result: Order[] = [];
  for (const choice of choices) if (result.length < 3 && !result.some(o => o.unitId === choice.order.unitId || same(o.to, choice.order.to))) result.push(choice.order);
  return result;
}
function fight(a: Unit, b: Unit, destination: Pos, events: string[]): Unit | null {
  if (a.hp === b.hp) { events.push(`${label(a)} and ${label(b)} destroy each other at ${name(destination)}.`); return null; }
  const winner = a.hp > b.hp ? a : b, loser = winner === a ? b : a;
  winner.hp -= loser.hp; winner.x = destination.x; winner.y = destination.y;
  events.push(`${label(winner)} defeats ${label(loser)} at ${name(destination)} and has ${winner.hp} HP left.`);
  return winner;
}
const label = (u: Unit) => `${u.side === "white" ? "White" : "Black"} ${u.kind}`;

export function resolve(g: Game): Game {
  if (g.winner || g.cleanupTargets.length || !g.planned.length) return g;
  const black = enemyOrders(g), orders = [...g.planned, ...black];
  const original = new Map(g.units.map(u => [u.id, { ...u }]));
  const byUnit = new Map(orders.map(o => [o.unitId, o]));
  const ambushes = orders
    .map(order => ({ order, attacker: original.get(order.unitId)! }))
    .filter(({ order, attacker }) => isPawnAmbush(g, attacker, order.to));
  const handled = new Set<string>(), survivors = new Map(g.units.map(u => [u.id, { ...u }])), events: string[] = [];
  const cleanupKillers = new Set<string>();
  const remove = (id: string) => survivors.delete(id);
  const put = (u: Unit) => survivors.set(u.id, u);
  // Reciprocal target orders are direct fights. Empty-square contests use the
  // same HP subtraction rule.
  for (let i = 0; i < orders.length; i++) for (let j = i + 1; j < orders.length; j++) {
    const a = original.get(orders[i].unitId)!, b = original.get(orders[j].unitId)!;
    const mutual = same(orders[i].to, b) && same(orders[j].to, a);
    const contest = !isPawnAmbush(g, a, orders[i].to) && !isPawnAmbush(g, b, orders[j].to) && !at(g, orders[i].to) && same(orders[i].to, orders[j].to);
    if (!mutual && !contest) continue;
    handled.add(a.id); handled.add(b.id); remove(a.id); remove(b.id);
    const winner = fight({ ...a }, { ...b }, contest ? orders[i].to : (a.hp > b.hp ? orders[i].to : orders[j].to), events);
    if (winner) {
      put(winner);
      const loser = winner.id === a.id ? b : a;
      if (loser.side === "white" && winner.side === "black") cleanupKillers.add(winner.id);
    }
  }
  for (const order of orders) {
    if (handled.has(order.unitId) || !survivors.has(order.unitId)) continue;
    if (isPawnAmbush(g, original.get(order.unitId)!, order.to)) continue;
    const mover = survivors.get(order.unitId)!, target = at(g, order.to), targetOrder = target ? byUnit.get(target.id) : undefined;
    const ambush = ambushes.find(({ attacker, order: held }) =>
      attacker.side !== mover.side && same(held.to, order.to) && survivors.has(attacker.id),
    );
    // Held pawn attacks fire when an opponent selects their empty diagonal.
    // A surviving target still completes its movement; a defeated target is
    // replaced by the pawn, exactly like a successful normal capture.
    if (ambush && !isPawnAmbush(g, original.get(order.unitId)!, order.to)) {
      const pawn = survivors.get(ambush.attacker.id)!;
      mover.hp -= pawn.hp;
      if (mover.hp <= 0) {
        remove(mover.id); pawn.x = order.to.x; pawn.y = order.to.y;
        events.push(`${label(pawn)} springs an ambush at ${name(order.to)} and captures ${label(mover)}.`);
        continue;
      }
      events.push(`${label(pawn)} springs an ambush at ${name(order.to)} for ${pawn.hp}. ${label(mover)} has ${mover.hp} HP left.`);
    }
    if (target && target.side !== mover.side && !handled.has(target.id) && !targetOrder) {
      // An idle unit cannot retaliate. The attacker deals its HP as damage;
      // it only occupies the square once that damage finishes the defender.
      target.hp -= mover.hp;
      if (target.hp <= 0) {
        remove(target.id); mover.x = order.to.x; mover.y = order.to.y;
        events.push(`${label(mover)} freely captures ${label(target)} at ${name(order.to)}.`);
        if (target.side === "white" && mover.side === "black") cleanupKillers.add(mover.id);
      } else events.push(`${label(mover)} freely hits ${label(target)} for ${mover.hp}. ${label(target)} has ${target.hp} HP left.`);
    } else {
      mover.x = order.to.x; mover.y = order.to.y;
      events.push(target ? `${label(mover)} takes ${name(order.to)} as ${label(target)} moves away.` : `${label(mover)} moves to ${name(order.to)}.`);
    }
  }
  for (const { attacker, order } of ambushes)
    if (survivors.has(attacker.id) && !orders.some(other => other.unitId !== attacker.id && original.get(other.unitId)!.side !== attacker.side && same(other.to, order.to)))
      events.push(`${label(attacker)} holds ${name(order.to)}, but no enemy enters.`);
  const units = [...survivors.values()];
  const whiteKing = units.some(u => u.side === "white" && u.kind === "king"), blackKing = units.some(u => u.side === "black" && u.kind === "king");
  const winner: Side | null = !whiteKing ? "black" : !blackKing ? "white" : null;
  if (winner) events.unshift(`${winner === "white" ? "White" : "Black"} captures the king and wins.`);
  const cleanupTargets = winner ? [] : [...cleanupKillers].filter(id => {
    const target = units.find(u => u.id === id);
    return !!target && units.some(u => u.side === "white" && legal({ ...g, units, planned: [], cleanupTargets: [], winner: null }, u).some(p => same(p, target)));
  });
  if (cleanupTargets.length) events.unshift("Cleanup opportunity: a friendly piece can strike the enemy that just captured your ally.");
  return { units, planned: [], cleanupTargets, turn: g.turn + 1, log: events.slice(0, 8), winner };
}
