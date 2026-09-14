import { ENCOUNTERS, PIECES } from "../src/game/content";
import {
  distance,
  moves,
  targets,
  move,
  same,
  previewDamage,
  victims,
  attack,
  waitPiece,
  endPhase,
  enemyStep,
  openShop,
  buy,
  purchaseReason,
  continueRun,
  chooseEvent,
  useConsumable,
} from "../src/game/engine";
import type { Game } from "../src/game/engine";
import type { Pos } from "../src/game/content";
export type Plan = { id: string; pos: Pos; target?: string };
// A deliberately shallow playtester: it sees legal actions and immediate damage,
// but never reads random offers ahead of time or changes the rules.
export function plan(g: Game): Plan | undefined {
  const ready = g.pieces.filter(
    (p) => p.side === "player" && !p.acted && (!g.active || g.active === p.id),
  );
  const enemies = g.pieces.filter((p) => p.side === "enemy");
  let best: { score: number; plan: Plan } | undefined;
  for (const p of ready)
    for (const pos of [{ x: p.x, y: p.y }, ...moves(g, p)]) {
      const sim = same(pos, p) ? g : move(g, p.id, pos),
        sp = sim.pieces.find((u) => u.id === p.id)!;
      const nearest = Math.min(...enemies.map((u) => distance(sp, u)));
      let score = -nearest * 0.5,
        target: string | undefined;
      if (p.kind === "king") score = -Math.abs(nearest - 4) * 0.5;
      for (const t of targets(sim, sp)) {
        const vs = victims(sim, sp, t);
        const value = vs.reduce((sum, u) => {
          const dmg = previewDamage(sim, sp, u);
          return (
            sum +
            Math.min(dmg, u.hp) * 2 +
            (dmg >= u.hp ? PIECES[u.kind].value * 2 + 9 : 0) +
            (u.kind === "king" ? 8 : 0)
          );
        }, 0);
        if (value > score) {
          score = value;
          target = t.id;
        }
      }
      // Keep the king away from enemy movement-plus-attack reach when possible.
      if (p.kind === "king") {
        const danger = enemies.reduce(
          (n, u) =>
            n +
            (distance(sp, u) <= PIECES[u.kind].move + PIECES[u.kind].range
              ? PIECES[u.kind].atk
              : 0),
          0,
        );
        score -= danger * (p.hp < 8 ? 5 : 2);
      }
      if (!same(pos, p)) score -= 0.05;
      if (!best || score > best.score)
        best = { score, plan: { id: p.id, pos, target } };
    }
  return best?.plan;
}
export function playerStep(g: Game): Game {
  if (g.screen !== "battle" || g.turn !== "player") return g;
  const king = g.pieces.find((p) => p.side === "player" && p.kind === "king");
  if (king && king.hp <= king.maxHp - 4 && !g.consumed && !g.active) {
    const i = g.inventory.indexOf("repair");
    if (i >= 0) return useConsumable(g, i, [king]);
  }
  const p = plan(g);
  if (!p) return endPhase(g);
  const original = g.pieces.find((u) => u.id === p.id)!;
  if (!same(original, p.pos)) g = move(g, p.id, p.pos);
  return p.target ? attack(g, p.id, p.target) : waitPiece(g, p.id);
}
export function shopStrategy(g: Game): Game {
  if (g.screen === "reward") g = openShop(g);
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
  for (const { i } of g.offers
    .map((id, i) => ({ id, i }))
    .sort((a, b) => rank(b.id) - rank(a.id))) {
    if (!purchaseReason(g, i)) g = buy(g, i);
  }
  return continueRun(g);
}
export function simulate(start: Game, maxActions = 800) {
  let g = start,
    actions = 0;
  const battles: {
    name: string;
    round: number;
    hp: number;
    material: number;
    result: string;
  }[] = [];
  while (
    g.screen !== "victory" &&
    g.screen !== "defeat" &&
    actions++ < maxActions
  ) {
    const before = g;
    if (g.screen === "battle")
      g = g.turn === "player" ? playerStep(g) : enemyStep(g);
    else if (g.screen === "reward" || g.screen === "shop") g = shopStrategy(g);
    else if (g.screen === "event")
      g = chooseEvent(g, g.kingHp < g.kingMax - 4 ? "heal" : "gold");
    if (before.screen === "battle" && g.screen !== "battle")
      battles.push({
        name: ENCOUNTERS[g.floor].name,
        round: g.round,
        hp: g.kingHp,
        material: g.material,
        result: g.screen,
      });
    if (g === before)
      throw new Error(
        "Simulation stuck at " + g.screen + " " + g.turn + " " + g.round,
      );
  }
  return { g, actions, battles };
}
