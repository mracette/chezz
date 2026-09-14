# Simultaneous-orders core

This prototype intentionally replaces the previous activation, shop, and
campaign layers with a single question: is planning against hidden enemy orders
fun?

## Locked first-pass rules

- Each side plans up to three orders, then they resolve simultaneously.
- An order is only a piece and a legal chess destination. A piece and a
  destination can each appear once per side each phase.
- Chess geometry applies: sliding pieces use rays; knights jump; pawns move
  forward and capture diagonally.
- Health uses material values: pawn 1, knight/bishop 3, rook 5, queen 9, king
  5. Capturing the king wins.
- Moving into an idle enemy is a free fight. The survivor loses the opponent's
  HP and occupies the square. Equal HP destroys both pieces.
- Reciprocal attacks and simultaneous contests for an empty square use the
  same fight rule.
- A targeted piece with an order escapes to its destination; the attacker takes
  its original square without a fight.
- Player orders stay editable until Resolve. Enemy orders are hidden.

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
