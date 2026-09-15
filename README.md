# Chezz — Escape from Exile

This branch is a three-encounter prototype: a lone king, two recruitment/healing
choices, permanent losses, persistent health, a tilted cartoon board, and
animated simultaneous orders. Choose **Always trade** or **Free hits** at the
start to compare the two combat models on identical boards.

```sh
npm ci
npm run dev
```

Open the local URL, begin the rebellion, select the king and a highlighted
destination, then Resolve. One order per piece, up to three as your army grows.
The enemy plan appears during playback. Defeat every enemy to reach camp.

`npm test`, `npm run build`, and `npm run test:e2e` validate the exile slice.
The current browser suite covers this interface; earlier browser scenarios
remain in the repository as references to the previous prototype.

See [docs/exile-run.md](docs/exile-run.md) for the rules, scope, and playtest
questions. A branch-specific preview is published at
**[mracette.github.io/chezz/exile](https://mracette.github.io/chezz/exile/)**;
the main game remains at its usual root URL.

---

The documentation below describes the earlier Between Worlds prototype, whose
content and engine remain available for reference.

# Chezz — Between Worlds (earlier prototype)

A browser tactics game with chess pieces. A complete first-floor prototype: five battles, a boss, shops, an event, two starting sets, gambits, upgrades, consumables, and local save/resume.

## Run locally

Use Node **24** (see .nvmrc).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally http://127.0.0.1:5173.

```sh
npm test                 # Rules, interactions, and deterministic full-floor playtests
npm run build            # Type checking and production build
npx playwright install chromium
npm run test:e2e         # Actual browser interaction and complete UI playthrough
npm run preview          # Serve the production build
```

## Play

1. Choose a starting set and enter a seed.
2. Select a friendly piece. Bright cyan squares show movement; red squares show attackable enemies. Friendly pieces glow green when ready, amber after moving, and turn slate gray when done.
3. Move, then attack, or attack without moving. A piece's attack ends its activation. Use **Finish activation** to skip its remaining actions.
4. Activate as many pieces as you wish, then **End phase**. The enemy moves its whole army.
5. Capture the enemy king to win immediately. Keep yours alive. There is no round limit; optional objectives add 12 gold.
6. Shop between encounters. Defeat the Iron Crown by reducing its king to zero health.

Shortcuts: **E** ends the phase. **Space** finishes a selected ready piece, or ends the phase when no ready piece is selected. **T** toggles danger squares, including enemy movement before attacking, **Escape** undoes an uncommitted move (before attacking or finishing), or cancels selection or a consumable. All squares also support keyboard activation.

Movement uses orthogonal paths. Knights jump across blockers. Bishop attacks are diagonal; queens attack straight or diagonally. Other pieces attack orthogonally adjacent squares. There are no automatic counterattacks, check restrictions, castling, or en passant.

Ordinary attacks leave the attacker in place. Rooks push surviving targets when the destination is open. The strongest adjacent pawn/king protection applies; it does not stack. Hits deal at least 1 damage unless Veil blocks the hit completely.

Material is a post-battle statistic, never a victory requirement. Values: pawn 1; knight/bishop 3; rook 5; queen 9. Capturing the enemy king wins even if you have lost more material. Your king’s death immediately ends the run.

King health, gold, gambits, upgrades, and unused consumables persist. Your other pieces return at full health between encounters. Three gambit slots and two consumable slots encourage choices. One consumable can be used each player phase, between activations. Shops allow releasing gambits or discarding consumables without a refund.

The Mahogany Set starts with 18 king health, 26 gold, and Queen’s Gambit. The Speed Mat starts with 13 king health, 40 gold, and First Light.

## Architecture

- **src/game/content.ts**: piece stats, item descriptions and prices, encounters, starting sets.
- **src/game/engine.ts**: deterministic rules, effect resolution, enemy decisions, run transitions, save validation.
- **src/render/Board.tsx**: Three.js orthographic scene, procedural piece models, raycasting, movement/attack overlays, health and impact feedback. No combat decisions live here.
- **src/App.tsx**: screens, controls, autosave, settings, targeting, and the developer lab.
- **src/components/Art.tsx**: original vector illustrations for gambits, upgrades, and consumables.
- **public/art/limbo.png**: generated cosmic environment. The board and pieces are rendered in real time.
- **tests/strategy.ts**: a shallow, legal-action playtester, separate from enemy AI.

Commands return a new serializable game state. Invalid commands leave the state unchanged. Animation consumes the results; it cannot change damage or turn order. Seeded randomness affects offers. The same seed, build version, and action sequence reproduce a run.

Enemy AI evaluates one activation at a time, routes around missing squares, and protects its king from exposed trades. Danger overlays combine every enemy’s possible move-and-attack range on the current board. Brighter red means more enemies can attack a square; red borders remain visible on cyan movement squares. Hovering an enemy shows its individual range; with T enabled it emphasizes that enemy and dims the others. Aiming at an attackable target keeps the damage preview and existing movement highlights stable. These show possible attacks, not committed enemy actions. Boss rooks favor staying near their king.

## Iterate

In development, open **Developer lab** in the footer. In a published build, add **?lab=1** to the URL. Load any encounter, grant items, heal the army, or export state and action history. These tools modify your local run.

Settings include sound, reduced motion, fast enemy turns, and JSON export. Saves use **chezz.run.v1** in local storage; they are specific to the browser and site origin. Saves from the earlier material-target rules are upgraded in place: active battles receive an enemy king without resetting gold, health, or progress. A new run replaces the current save only when started. Export files contain the seed, current state, and action history.

## Publish

Play at **[mracette.github.io/chezz](https://mracette.github.io/chezz/)**. The source repository is public.

The GitHub Actions workflow checks rules, builds, and runs browser tests before publishing **dist** to GitHub Pages on pushes to **main**.

In repository **Settings → Pages**, select **GitHub Actions** as the source. Relative asset URLs support the repository subpath, and there is no backend or runtime API key.

The repository Actions variable **PAGES_ENABLED** is set to **true** to enable deployment after verification passes.

## MVP boundaries

One linear floor with authored layouts; randomness comes from seeded item offers. No multiplayer, endless mode, campaign map, recruitment, or permanent metaprogression. Game balance is provisional and intended for iteration.

The browser needs WebGL for the 3D scene. If WebGL cannot initialize, a simpler accessible board remains playable. Typography is bundled locally; font licenses are included under **public/fonts**.

Art direction, asset provenance, and the image-generation prompt are recorded in **docs/art-direction.md**. Game decisions are recorded in **docs/design.md**.
