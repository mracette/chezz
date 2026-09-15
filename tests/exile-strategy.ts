import { at, budget, legal, plan, resolveTurn } from "../src/game/exile";
import type { Order, Run } from "../src/game/exile";

// Test driver with a one-turn lookahead. Its choices are deliberately separate
// from the enemy policy; simulations show reachability, not human enjoyment.
export function choosePlan(g: Run): Order[] {
  const army = g.units.filter(u => u.side === "white");
  const choices = army.map(u => [null, { unitId: u.id, to: { x: u.x, y: u.y }, defend: true }, ...legal(g, u).map(to => ({ unitId: u.id, to }))] as (Order | null)[]);
  let best: Order[] = [], score = -Infinity;
  const walk = (index: number, proposed: Order[]) => {
    if (index < choices.length) { for (const o of choices[index]) walk(index + 1, o ? [...proposed, o] : proposed); return; }
    if (!proposed.length || proposed.length > budget(g)) return;
    let ready = { ...g, planned: [] };
    for (const o of proposed) ready = plan(ready, o);
    if (ready.planned.length !== proposed.length) return;
    const result = resolveTurn(ready).run;
    if (result.phase === "defeat") return;
    const king = result.units.find(u => u.id === "king")!;
    const enemies = result.units.filter(u => u.side === "black");
    const army = result.units.filter(u => u.side === "white");
    const approach = army.reduce((sum, u) => sum + (enemies.length ? Math.min(...enemies.map(v => Math.abs(u.x - v.x) + Math.abs(u.y - v.y))) : 0), 0);
    const value = (result.phase === "camp" || result.phase === "victory" ? 1000 : 0) + king.hp * 22 + army.reduce((sum, u) => sum + u.hp * 8, 0) - enemies.reduce((sum, u) => sum + u.hp * 30, 0) - enemies.length * 25 - approach * 3;
    if (value > score) { score = value; best = ready.planned; }
  };
  walk(0, []);
  if (!best.length) {
    const king = g.units.find(u => u.id === "king")!;
    best = [{ unitId: king.id, to: king, defend: true }];
  }
  return best;
}
