import { newGame } from "../src/game/engine";
import { simulate } from "../tests/strategy";
const shop = !process.argv.includes("--no-shop");
const seeds = process.argv.slice(2).filter((arg) => arg !== "--no-shop");
for (const set of ["mahogany", "speed"]) {
  for (const seed of seeds.length
    ? seeds
    : [
        "BETWEEN-WORLDS",
        "PRISM",
        "ECLIPSE",
        "SMALL-INFINITY",
        "KING-1",
        "KING-2",
      ]) {
    const result = simulate(newGame(seed, set), 800, shop);
    console.log(
      JSON.stringify({
        set,
        seed,
        shop,
        outcome: result.g.screen,
        actions: result.actions,
        battles: result.battles,
        survivors: result.g.pieces.map(
          (p) => `${p.side}:${p.kind}:${p.hp}@${p.x},${p.y}`,
        ),
      }),
    );
  }
}
