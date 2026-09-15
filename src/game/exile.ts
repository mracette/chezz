export type Side = "white" | "black";
export type Kind = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
export type Mode = "retaliation" | "ambush";
export type Pos = { x: number; y: number };
export type Unit = Pos & { id: string; side: Side; kind: Kind; hp: number };
export type Order = { unitId: string; to: Pos; defend?: boolean };
export type Encounter = { title: string; story: string; reward: number; width: number; height: number; walls: Pos[]; spawns: [Kind, number, number, number][]; starts: Pos[] };
export type Run = {
  version: 1; mode: Mode; encounter: number; turn: number;
  phase: "planning" | "cleanup" | "camp" | "victory" | "defeat";
  gold: number; units: Unit[]; planned: Order[]; cleanupTargets: string[];
  log: string[]; history: string[]; nextId: number;
};
export type Beat = { text: string; units: Unit[]; focus: Pos[]; damage: { id: string; amount: number }[] };
export type Resolution = { run: Run; orders: Order[]; before: Unit[]; beats: Beat[] };
export const HP: Record<Kind, number> = { king: 5, queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1 };
export const ENCOUNTERS: Encounter[] = [
  { title: "The roadside patrol", story: "Two royal lackeys. One very annoyed former king. Clear the road.", reward: 8, width: 4, height: 4, walls: [], spawns: [["pawn", 0, 1, 1], ["pawn", 2, 1, 1]], starts: [{ x: 1, y: 3 }] },
  { title: "The first follower", story: "The old toll gate is closed. Find a way around, and bring everyone home.", reward: 8, width: 6, height: 4, walls: [{ x: 3, y: 1 }, { x: 3, y: 2 }], spawns: [["pawn", 0, 0, 1], ["pawn", 3, 0, 1], ["pawn", 5, 0, 1]], starts: [{ x: 1, y: 3 }, { x: 0, y: 3 }, { x: 5, y: 3 }] },
  { title: "The narrow crossing", story: "A battered knight holds the bridge. Your little rebellion has somewhere to be.", reward: 0, width: 6, height: 6, walls: [2, 3].flatMap(y => [0, 1, 4, 5].map(x => ({ x, y }))), spawns: [["knight", 3, 0, 2], ["pawn", 1, 1, 1], ["pawn", 4, 1, 1]], starts: [{ x: 2, y: 5 }, { x: 1, y: 5 }, { x: 4, y: 5 }] },
];
export const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
export const coord = (g: Run, p: Pos) => "abcdefgh"[p.x] + (ENCOUNTERS[g.encounter].height - p.y);
export const at = (g: Run, p: Pos) => g.units.find(u => same(u, p));
export const budget = (g: Run) => Math.min(3, g.units.filter(u => u.side === "white").length);
export const passable = (g: Run, p: Pos) => {
  const e = ENCOUNTERS[g.encounter];
  return p.x >= 0 && p.y >= 0 && p.x < e.width && p.y < e.height && !e.walls.some(w => same(w, p));
};
const label = (u: Unit) => `${u.side === "white" ? "Your" : "Enemy"} ${u.kind}`;
const diagonals = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const straights = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const leaps = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

export function legal(g: Run, u: Unit): Pos[] {
  if (u.kind === "pawn") {
    const dy = u.side === "white" ? -1 : 1, out: Pos[] = [];
    const forward = { x: u.x, y: u.y + dy };
    if (passable(g, forward) && !at(g, forward)) out.push(forward);
    for (const dx of [-1, 1]) {
      const p = { x: u.x + dx, y: u.y + dy };
      if (passable(g, p) && at(g, p)?.side !== u.side) out.push(p);
    }
    return out;
  }
  if (u.kind === "knight" || u.kind === "king")
    return (u.kind === "knight" ? leaps : [...straights, ...diagonals]).map(([dx, dy]) => ({ x: u.x + dx, y: u.y + dy })).filter(p => passable(g, p) && at(g, p)?.side !== u.side);
  const out: Pos[] = [];
  for (const [dx, dy] of u.kind === "rook" ? straights : u.kind === "bishop" ? diagonals : [...straights, ...diagonals])
    for (let n = 1; n < 8; n++) {
      const p = { x: u.x + dx * n, y: u.y + dy * n };
      if (!passable(g, p)) break;
      const other = at(g, p);
      if (other?.side === u.side) break;
      out.push(p);
      if (other) break;
    }
  return out;
}
export function held(g: Run, o: Order) {
  const u = g.units.find(u => u.id === o.unitId);
  return !!u && !o.defend && u.kind === "pawn" && o.to.x !== u.x && !at(g, o.to);
}
export function route(g: Run, o: Order): Pos[] {
  const u = g.units.find(u => u.id === o.unitId);
  if (!u || o.defend) return [];
  if (u.kind === "knight" || held(g, o)) return [{ x: u.x, y: u.y }, o.to];
  const dx = Math.sign(o.to.x - u.x), dy = Math.sign(o.to.y - u.y);
  const length = Math.max(Math.abs(o.to.x - u.x), Math.abs(o.to.y - u.y));
  return Array.from({ length: length + 1 }, (_, n) => ({ x: u.x + dx * n, y: u.y + dy * n }));
}
function spawn(g: Run, army: Unit[]): Run {
  const e = ENCOUNTERS[g.encounter];
  const whites = army.map((u, i) => ({ ...u, ...e.starts[i] }));
  const enemies = e.spawns.map(([kind, x, y, hp], i) => ({ id: `enemy-${g.encounter}-${i}`, kind, side: "black" as const, x, y, hp }));
  return { ...g, units: [...whites, ...enemies], planned: [], cleanupTargets: [], phase: "planning", turn: 1, log: [e.story] };
}
export function newRun(mode: Mode = "retaliation"): Run {
  const g: Run = { version: 1, mode, encounter: 0, turn: 1, phase: "planning", gold: 2, units: [], planned: [], cleanupTargets: [], log: [], history: [], nextId: 1 };
  return spawn(g, [{ id: "king", side: "white", kind: "king", hp: 5, x: 1, y: 3 }]);
}
export function plan(g: Run, order: Order): Run {
  if (g.phase !== "planning") return g;
  const u = g.units.find(u => u.id === order.unitId);
  if (!u || u.side !== "white" || (order.defend ? !same(u, order.to) : !legal(g, u).some(p => same(p, order.to)))) return g;
  const planned = g.planned.filter(o => o.unitId !== order.unitId);
  if (planned.length >= budget(g) || planned.some(o => same(o.to, order.to))) return g;
  return { ...g, planned: [...planned, order] };
}
export function unplan(g: Run, id: string): Run { return g.phase === "planning" ? { ...g, planned: g.planned.filter(o => o.unitId !== id) } : g; }
export function enemyOrders(g: Run): Order[] {
  const king = g.units.find(u => u.id === "king")!;
  const choices: { order: Order; score: number }[] = [];
  for (const u of g.units.filter(u => u.side === "black")) {
    for (const to of legal(g, u)) {
      const o = { unitId: u.id, to };
      if (held(g, o)) continue;
      const victim = at(g, to);
      const score = victim?.side === "white" ? 100 + Math.min(u.hp, victim.hp) * 3 + (victim.kind === "king" ? 5 : 0) : 20 - Math.abs(to.x - king.x) - Math.abs(to.y - king.y);
      choices.push({ order: o, score });
    }
    // A blocked pawn can still defend instead of becoming an inert obstacle.
    choices.push({ order: { unitId: u.id, to: { x: u.x, y: u.y }, defend: true }, score: 0 });
  }
  choices.sort((a, b) => b.score - a.score || a.order.unitId.localeCompare(b.order.unitId) || a.order.to.x - b.order.to.x || a.order.to.y - b.order.to.y);
  const orders: Order[] = [];
  for (const { order } of choices)
    if (orders.length < 3 && !orders.some(o => o.unitId === order.unitId || same(o.to, order.to))) orders.push(order);
  return orders;
}
function finish(g: Run): Run {
  if (!g.units.some(u => u.id === "king")) return { ...g, phase: "defeat", cleanupTargets: [], planned: [], log: ["The crown fell. Your rebellion ends here.", ...g.log] };
  if (!g.units.some(u => u.side === "black")) {
    const last = g.encounter === ENCOUNTERS.length - 1;
    return { ...g, phase: last ? "victory" : "camp", cleanupTargets: [], planned: [], gold: g.gold + ENCOUNTERS[g.encounter].reward, log: [last ? "Across the bridge. Your rebellion has begun." : `Road cleared. +${ENCOUNTERS[g.encounter].reward} gold.`, ...g.log] };
  }
  return g;
}

/** All hit damage is calculated from the same starting snapshot. Playback is
 * a presentation of those results, and cannot alter the outcome. */
export function resolveTurn(g: Run, black = enemyOrders(g)): Resolution {
  const before = g.units.map(u => ({ ...u }));
  if (g.phase !== "planning" || !g.planned.length) return { run: g, orders: [], before, beats: [] };
  const orders = [...g.planned, ...black];
  const orderById = new Map(orders.map(o => [o.unitId, o]));
  const byId = new Map(before.map(u => [u.id, u]));
  const moving = (o: Order | undefined) => !!o && !o.defend && !held(g, o);
  const damage = new Map<string, number>(), moves = new Map<string, Pos>();
  const interactions: { text: string; ids: string[]; focus: Pos[] }[] = [];
  const paired = new Set<string>(), killers = new Map<string, string>();
  const hit = (victim: Unit, attacker: Unit) => {
    const guarded = g.mode === "retaliation" && orderById.get(victim.id)?.defend;
    const amount = Math.max(0, attacker.hp - (guarded ? 1 : 0));
    damage.set(victim.id, (damage.get(victim.id) ?? 0) + amount);
    killers.set(victim.id, attacker.id);
    return amount;
  };
  for (let i = 0; i < orders.length; i++) for (let j = i + 1; j < orders.length; j++) {
    const a = byId.get(orders[i].unitId)!, b = byId.get(orders[j].unitId)!;
    if (a.side === b.side || !moving(orders[i]) || !moving(orders[j])) continue;
    const reciprocal = same(orders[i].to, b) && same(orders[j].to, a);
    const contest = same(orders[i].to, orders[j].to);
    if ((!reciprocal && !contest) || paired.has(a.id) || paired.has(b.id)) continue;
    paired.add(a.id); paired.add(b.id); hit(a, b); hit(b, a);
    moves.set(a.id, orders[i].to); moves.set(b.id, orders[j].to);
    interactions.push({ text: `${label(a)} and ${label(b)} clash. Both trade HP.`, ids: [a.id, b.id], focus: [orders[i].to, orders[j].to] });
  }
  for (const o of orders) {
    const a = byId.get(o.unitId)!;
    if (o.defend || held(g, o) || paired.has(a.id)) continue;
    const b = at(g, o.to), bOrder = b && orderById.get(b.id);
    if (b && !moving(bOrder)) {
      const dealt = hit(b, a);
      const counters = g.mode === "retaliation" || bOrder?.defend;
      const received = counters ? hit(a, b) : 0;
      interactions.push({ text: `${label(a)} hits ${label(b)} for ${dealt}${counters ? ` and takes ${received} back` : " with no return damage"}.`, ids: [a.id, b.id], focus: [o.to] });
      moves.set(a.id, o.to);
    } else {
      moves.set(a.id, o.to);
      interactions.push({ text: b ? `${label(a)} reaches ${coord(g, o.to)} as ${label(b)} moves away.` : `${label(a)} moves to ${coord(g, o.to)}.`, ids: [], focus: [o.to] });
    }
  }
  for (const o of orders.filter(o => held(g, o))) {
    const pawn = byId.get(o.unitId)!;
    const entrant = orders.find(other => byId.get(other.unitId)!.side !== pawn.side && moving(other) && same(other.to, o.to));
    if (entrant) {
      const b = byId.get(entrant.unitId)!; hit(b, pawn);
      if (g.mode === "retaliation") hit(pawn, b);
      moves.set(pawn.id, o.to);
      interactions.push({ text: `${label(pawn)} ambushes ${label(b)} at ${coord(g, o.to)}${g.mode === "retaliation" ? "; the target counterattacks" : ""}.`, ids: [pawn.id, b.id], focus: [o.to] });
    } else interactions.push({ text: `${label(pawn)} watches ${coord(g, o.to)}. No enemy enters; the order is spent.`, ids: [], focus: [o.to] });
  }
  const survivors = before.filter(u => u.hp > (damage.get(u.id) ?? 0)).map(u => ({ ...u, hp: u.hp - (damage.get(u.id) ?? 0) }));
  for (const survivor of survivors) {
    const to = moves.get(survivor.id);
    if (!to) continue;
    const occupant = at(g, to);
    const stillThere = occupant && survivors.some(u => u.id === occupant.id) && !moving(orderById.get(occupant.id));
    const ambush = orderById.get(survivor.id);
    const livingEntrant = ambush && held(g, ambush) && survivors.some(u => u.side !== survivor.side && same(moves.get(u.id) ?? u, to));
    if (!stillThere && !livingEntrant) { survivor.x = to.x; survivor.y = to.y; }
  }
  // Failed captures leave attackers in place. Cancel arrivals into an occupied
  // square until dependencies settle; pieces never overlap after resolution.
  let cancelled = true;
  while (cancelled) {
    cancelled = false;
    for (const u of survivors) {
      const origin = byId.get(u.id)!;
      if (same(u, origin) || !survivors.some(v => v.id !== u.id && same(v, u))) continue;
      u.x = origin.x; u.y = origin.y; cancelled = true;
      interactions.push({ text: `${label(u)} stays back: its destination is still occupied.`, ids: [], focus: [{ x: u.x, y: u.y }] });
    }
  }
  const whiteLosses = before.filter(u => u.side === "white" && !survivors.some(v => v.id === u.id));
  let next: Run = { ...g, units: survivors, planned: [], cleanupTargets: [], turn: g.turn + 1, log: interactions.map(i => i.text), history: [...g.history, `Battle ${g.encounter + 1}, turn ${g.turn}: ${JSON.stringify(orders)}`, ...interactions.map(i => i.text)] };
  const targets = [...new Set(whiteLosses.map(u => killers.get(u.id)).filter((id): id is string => !!id))];
  next.cleanupTargets = targets.filter(id => {
    const enemy = survivors.find(u => u.id === id);
    return !!enemy && survivors.some(u => u.side === "white" && legal(next, u).some(p => same(p, enemy)));
  });
  if (next.cleanupTargets.length) next.phase = "cleanup";
  next = finish(next);
  const interim = before.map(u => ({ ...u }));
  const applied = new Set<string>();
  const beats: Beat[] = interactions.map(i => {
    for (const id of i.ids) {
      if (applied.has(id)) continue;
      applied.add(id);
      const u = interim.find(u => u.id === id)!;
      u.hp = Math.max(0, u.hp - (damage.get(id) ?? 0));
    }
    return { text: i.text, units: interim.filter(u => u.hp > 0).map(u => ({ ...u })), focus: i.focus, damage: i.ids.filter(id => (damage.get(id) ?? 0) > 0).map(id => ({ id, amount: damage.get(id)! })) };
  });
  beats.push({ text: next.phase === "cleanup" ? "An ally fell. Choose one cleanup strike or let it go." : next.log[0] ?? "Take stock. Plan your next turn.", units: survivors, focus: [], damage: [] });
  return { run: next, orders, before, beats };
}
export function declineCleanup(g: Run): Run { return g.phase === "cleanup" ? { ...g, phase: "planning", cleanupTargets: [], log: ["You let the enemy go. Plan the next turn.", ...g.log], history: [...g.history, "Declined cleanup"] } : g; }
export function cleanupStrike(g: Run, attackerId: string, targetId: string): Resolution {
  const before = g.units.map(u => ({ ...u })), a = g.units.find(u => u.id === attackerId), b = g.units.find(u => u.id === targetId);
  if (g.phase !== "cleanup" || !a || !b || a.side !== "white" || !g.cleanupTargets.includes(targetId) || !legal(g, a).some(p => same(p, b))) return { run: g, orders: [], before, beats: [] };
  const survivors = before.filter(u => u.id !== b.id || u.hp > a.hp).map(u => ({ ...u, hp: u.id === b.id ? u.hp - a.hp : u.hp }));
  const moved = survivors.find(u => u.id === a.id)!;
  if (!survivors.some(u => u.id === b.id)) { moved.x = b.x; moved.y = b.y; }
  const text = `${label(a)} cleans up ${label(b)} for ${a.hp} damage. No return hit.`;
  const next = finish({ ...g, units: survivors, cleanupTargets: [], phase: "planning", log: [text, ...g.log], history: [...g.history, text] });
  return { run: next, orders: [{ unitId: a.id, to: { x: b.x, y: b.y } }], before, beats: [{ text, units: survivors, focus: [b], damage: [{ id: b.id, amount: a.hp }] }] };
}
export type CampChoice = "bishop" | "rook" | "heal";
export const COST: Record<CampChoice, number> = { bishop: 6, rook: 8, heal: 4 };
export function campReason(g: Run, choice: CampChoice): string {
  if (g.phase !== "camp") return "Camp is closed";
  if (g.gold < COST[choice]) return "Not enough gold";
  if (choice === "heal" && g.units.find(u => u.id === "king")!.hp >= 5) return "King at full health";
  return "";
}
export function leaveCamp(g: Run, choice: CampChoice | "save"): Run {
  if (g.phase !== "camp" || (choice !== "save" && campReason(g, choice))) return g;
  const army = g.units.filter(u => u.side === "white").map(u => ({ ...u }));
  if (choice === "heal") { const king = army.find(u => u.id === "king")!; king.hp = Math.min(5, king.hp + 2); }
  else if (choice !== "save") army.push({ id: `ally-${g.nextId}`, side: "white", kind: choice, hp: HP[choice], x: 0, y: 0 });
  return spawn({ ...g, encounter: g.encounter + 1, gold: g.gold - (choice === "save" ? 0 : COST[choice]), nextId: g.nextId + (choice === "bishop" || choice === "rook" ? 1 : 0), history: [...g.history, `Camp: ${choice}`] }, army);
}
export function readRun(raw: string | null): Run | null {
  try {
    const g = JSON.parse(raw ?? "null") as Run | null;
    if (!g || g.version !== 1 || !["retaliation", "ambush"].includes(g.mode) || !Number.isInteger(g.encounter) || !ENCOUNTERS[g.encounter] || !["planning", "cleanup", "camp", "victory", "defeat"].includes(g.phase) || !Array.isArray(g.units) || !Array.isArray(g.planned) || !Array.isArray(g.cleanupTargets) || !Array.isArray(g.log) || !Array.isArray(g.history) || !Number.isFinite(g.gold) || !Number.isInteger(g.turn) || !Number.isInteger(g.nextId)) return null;
    if (g.units.some(u => !HP[u.kind] || !["white", "black"].includes(u.side) || !passable(g, u) || !Number.isFinite(u.hp) || u.hp <= 0 || u.hp > HP[u.kind])) return null;
    if (new Set(g.units.map(u => u.id)).size !== g.units.length || new Set(g.units.map(u => `${u.x},${u.y}`)).size !== g.units.length) return null;
    return g;
  } catch { return null; }
}
