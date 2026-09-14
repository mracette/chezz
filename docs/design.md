# Prototype decisions

## Identity

Chezz uses chess as the visual vocabulary for a whole-army tactics roguelike. It requires no chess knowledge. The first floor should make movement, positioning, material exchanges, and build interactions readable.

## Combat

The player gets the first full phase. Each unit can move once, then attack once. Attacking ends the activation. Once a move is committed, that unit must finish before another activates. Enemy units follow the same rules. No half-turn, alternating-single-piece mode, or move-system comparison is implemented.

HP, attack, movement, attack range/shape, and material value distinguish pieces. Pawns protect, rooks push, knights jump, bishops project diagonal damage, queens offer versatile offense, and kings protect nearby allies. Losing your king ends the run.

Every encounter is won immediately when the enemy king is captured. Player king death takes priority. There are no material thresholds or round deadlines. Material remains a results statistic; optional bonuses use actual combat history.

The Iron Crown gains 2 protection while orthogonally adjacent to an ally. Its rook guards prefer staying close. Removing or displacing those guards exposes the king.

## Effects

An attack snapshots its victims and offensive bonuses, consumes next-attack resources, then resolves each hit. Protection and wards apply to damage, followed by deaths, material changes, capture/loss triggers, and final king-death checks. Secondary knight damage and rook displacement follow the main hit. Traps consume themselves after swapping occupants, preventing recursive swaps.

The developer lab and tests exercise these interactions without connecting the rules to animation timing.

## Run

There are five ordinary encounters and one boss. Shops occur after each ordinary encounter. After the third shop, the player chooses between healing and trading king health for gold. Other pieces reform between encounters, allowing sacrifice builds to function without introducing recruitment.

The Mahogany Set and Speed Mat implement the mahogany/speed-mat starting concepts within the cosmic visual direction. Set choice is independent of the seed.

## Art direction

Hyperdimensional cosmic limbo: a clear board in impossible space, sculpted ivory/obsidian pieces, floating crowns, subtle orbit lines, restrained iridescence, and precise tactical highlights. The graphics use actual 3D with an orthographic camera.

## Validation approach

Tests cover significant rules and interactions, seeded progression, and full-floor runs with both sets. Browser tests use actual board inputs, movement, attacks, shops, events, consumables, and saves. Simulation is evidence of playability, not proof of human fun or a substitute for player feedback.

## Familiar opening experiment

The **Academy Board** is an isolated onboarding experiment. Its first battle is
a six-piece, authored mate-in-one: pieces have orthodox chess movement, one
piece acts per side per turn, and all pieces have one health. A capture moves
onto the captured square and is decisive. Checkmate ends this opening; it
intentionally omits castling and en passant. The goal is recognition, not full
chess simulation.

Winning graduates the run into the normal health-bar tactics rules and restores
the king to its tactics health pool. This is the proposed pacing: **familiar
language → one clearly announced rule break → build-driven exceptions**. The
first opening should answer “how does this piece move?” before asking “what
does this build let it do?”

Playtest questions:

- Can a chess player predict every highlighted square before clicking?
- Do players understand that their next battle changes to move-then-attack,
  whole-army tactics without reading the help screen?
- Does the board choice feel like a meaningful run identity, or merely a
  tutorial toggle?

If the transition feels too abrupt, test one of two next variants: keep
classical movement while adding health bars, or unlock one movement mutation at
the first shop rather than changing every piece at once. Avoid a hybrid radius
system in the opening: it has the highest explanation cost and provides the
least useful chess intuition.
