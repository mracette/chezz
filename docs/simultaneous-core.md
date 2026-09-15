# Simultaneous-orders core

This prototype intentionally replaces the previous activation, shop, and
campaign layers with a single question: is planning against hidden enemy orders
fun?

## Locked first-pass rules

- Each side plans up to three orders, then they resolve simultaneously.
- An order is only a piece and a legal chess destination. A piece and a
  destination can each appear once per side each phase.
- Chess geometry applies: sliding pieces use rays; knights jump; pawns move
  forward and capture diagonally. A pawn may also reserve an empty diagonal as
  a held attack: it remains in place unless an enemy chooses that square.
- Health uses material values: pawn 1, knight/bishop 3, rook 5, queen 9, king
  5. Capturing the king wins.
- Moving into an idle enemy is a free hit: the defender loses the attacker's
  HP and does not retaliate. If destroyed, the attacker occupies its square.
  Reciprocal attacks and empty-square contests are the only situations where
  both units trade HP; equal HP destroys both pieces.
- Reciprocal attacks and simultaneous contests for an empty square use the
  same fight rule.
- A targeted piece with an order escapes to its destination; the attacker takes
  its original square without a fight.
- Player orders stay editable until Resolve. Enemy orders are hidden.
- A player piece may instead **Defend** in place. It spends an order and turns
  a direct attack on that piece into a reciprocal HP trade for that resolution.
- After resolution, if an enemy destroyed a player piece, the player gets one
  optional **Cleanup** reaction before planning resumes. A surviving player
  piece with normal line of sight may strike that specific enemy immediately,
  or the player may decline. The enemy does not receive this reaction yet.

## Deferred deliberately

- Gambits, consumables, shops, progression, and board-set modifiers.
- Non-movement actions. A bishop diagonal sniper is a candidate upgrade.
- Knight **Piggyback Attack**: after a successful capture, the knight may
  chain movement/attacks until it dies or lands safely.
- Complex multi-attacker resolution, special chess moves, and full check rules.

## Playtest prompts

1. Are the three orders enough to create meaningful prediction each turn?
2. Can the player predict why every result occurred from the resolution log?
3. Does the advanced six-vs-six setup reach tension quickly without feeling
   scripted?
4. Which outcomes feel surprising in a good way versus merely arbitrary?
