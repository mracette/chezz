# King-capture balance pass — v0.2

Every battle ends immediately when a king is captured. Material is a results statistic; there is no turn deadline. Other enemies can remain alive when the player wins. The optional bonus remains +12 gold.

## Encounters

| Battle            | Enemy king HP | Defenders                         | Purpose                                                                               |
| ----------------- | ------------: | --------------------------------- | ------------------------------------------------------------------------------------- |
| The Arrival       |             8 | Two pawns, bishop, rook           | Learn to clear an attack line and coordinate two attackers.                           |
| Crossed Signals   |            10 | Pawn, two bishops, rook           | Approach through diagonal coverage.                                                   |
| The Offering      |            10 | Two rooks, pawn, bishop           | Trade pieces to break a defended position; bishop sacrifice is optional.              |
| Broken Geometry   |            12 | Rook, queen, pawn, bishop, knight | Use alternate routes and knight jumps around missing squares.                         |
| The Last Exchange |            14 | Queen, two rooks, bishop, pawn    | Combine accumulated upgrades against a larger defense.                                |
| The Iron Crown    |            20 | Two rooks, bishop, knight, pawn   | Remove or displace adjacent guards to remove 2 damage reduction. Defenders gain 1 HP. |

Kings avoid standing in existing attack lines, while still taking opportunities to fight. Both enemy movement and the automated playtester use routes to reachable attack positions instead of straight-line distance, preventing units from waiting indefinitely behind a wall of missing squares. Only the boss's rooks have the extra incentive to stay adjacent to their king.

## Verification

The deterministic playtester considers legal moves, attack outcomes, king safety, and visible shop offers. It does not read future offers or alter game state outside normal actions. Tests used both starting sets across 18 seeds: BETWEEN-WORLDS, PRISM, ECLIPSE, SMALL-INFINITY, KING-1, KING-2, and CHECK-01 through CHECK-12.

All 36 shopping runs completed the floor without stalling, in at most 304 individual actions. Final king health ranged down to 4 HP. These are bot outcomes on authored layouts, not estimated human win rates.

| Battle            | Minimum rounds | Mean rounds | Maximum rounds |
| ----------------- | -------------: | ----------: | -------------: |
| The Arrival       |              2 |         2.5 |              3 |
| Crossed Signals   |              3 |         3.3 |              4 |
| The Offering      |              4 |         4.7 |              7 |
| Broken Geometry   |              4 |         6.1 |              8 |
| The Last Exchange |              3 |         4.5 |              7 |
| The Iron Crown    |              6 |         7.6 |              9 |

As a comparison, the same strategy with shop purchases disabled reached the boss but lost with both sets. This indicates that the current upgrades and economy matter to this strategy; it does not prove that an expert cannot win without them.

A manual opening battle finished in round 3 with all six friendly pieces alive and the king at 14/18 HP. It required clearing a pawn from the queen's diagonal, correcting action order with Undo, and pursuing the retreating king with the knight. The victory appeared immediately with two defenders still on the board.

Replay simulations with `npx --yes tsx scripts/playtest.ts`; append seeds to test different offers. Add `--no-shop` for the comparison. `npm test` checks rules, saved-game migration, and both starting sets. `npm run test:e2e` includes a complete floor through browser controls plus explicit regular-king and boss victories.

## Remaining balance questions

- Experienced players may find repeatable king rushes on the fixed layouts. Human feedback should guide harder variants rather than adding a hidden material requirement.
- Missing-square layouts take longer than the following battle in these simulations. That pacing change is intentional for now, but may need shortening after more player testing.
- Saves from the earlier material-target rules gain an enemy king in an empty square near its intended spawn. Gold, health, current round, and completed encounters are preserved; a fresh run gives the authored layouts.
