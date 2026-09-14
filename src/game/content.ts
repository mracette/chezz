export type Kind = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
export type Side = "player" | "enemy";
export type Pos = { x: number; y: number };
export type PieceDef = {
  name: string;
  hp: number;
  atk: number;
  move: number;
  range: number;
  value: number;
  role: string;
  rule: string;
  symbol: string;
};
export const PIECES: Record<Kind, PieceDef> = {
  pawn: {
    name: "Pawn",
    hp: 6,
    atk: 2,
    move: 2,
    range: 1,
    value: 1,
    role: "Support",
    rule: "Adjacent allies take 1 less damage. Protection does not stack.",
    symbol: "♟",
  },
  rook: {
    name: "Rook",
    hp: 11,
    atk: 3,
    move: 2,
    range: 1,
    value: 5,
    role: "Tank",
    rule: "Surviving targets are pushed one square away, if the square is open.",
    symbol: "♜",
  },
  knight: {
    name: "Knight",
    hp: 8,
    atk: 3,
    move: 3,
    range: 1,
    value: 3,
    role: "Mobile attacker",
    rule: "Jumps over pieces and missing tiles. Attacks an adjacent square.",
    symbol: "♞",
  },
  bishop: {
    name: "Bishop",
    hp: 6,
    atk: 3,
    move: 2,
    range: 3,
    value: 3,
    role: "Diagonal attacker",
    rule: "Attacks diagonally up to 3 squares. Pieces and missing squares block its attack.",
    symbol: "♝",
  },
  queen: {
    name: "Queen",
    hp: 8,
    atk: 4,
    move: 3,
    range: 2,
    value: 9,
    role: "Versatile attacker",
    rule: "Attacks straight or diagonally up to 2 squares. Fragile, but versatile.",
    symbol: "♛",
  },
  king: {
    name: "King",
    hp: 14,
    atk: 3,
    move: 2,
    range: 1,
    value: 0,
    role: "Keep alive",
    rule: "Adjacent allies take 1 less damage. If your king falls, the run ends.",
    symbol: "♚",
  },
};
export type GambitId =
  | "queens-gambit"
  | "blood-price"
  | "spoils"
  | "long-game"
  | "phalanx"
  | "momentum"
  | "fractured-crown"
  | "resonance";
export type UpgradeId = "sermon" | "fork" | "bulwark" | "ascension";
export type ConsumableId = "trapdoor" | "demolition" | "repair" | "smoke";
export type Item = {
  id: string;
  type: "gambit" | "upgrade" | "consumable" | "heal";
  name: string;
  desc: string;
  price: number;
  art: string;
  kind?: Kind;
};
export const GAMBITS: Item[] = [
  {
    id: "queens-gambit",
    type: "gambit",
    name: "Queen’s Gambit",
    desc: "Your queen gains 4 maximum health.",
    price: 24,
    art: "crown",
  },
  {
    id: "blood-price",
    type: "gambit",
    name: "Blood Price",
    desc: "When an ally falls, your next attack gains 2 damage. Stacks.",
    price: 22,
    art: "blood",
  },
  {
    id: "spoils",
    type: "gambit",
    name: "Spoils of War",
    desc: "Each enemy captured restores 1 health to your king.",
    price: 26,
    art: "sun",
  },
  {
    id: "long-game",
    type: "gambit",
    name: "Long Game",
    desc: "Attacks from 3 or more squares away deal 1 extra damage.",
    price: 20,
    art: "stairs",
  },
  {
    id: "phalanx",
    type: "gambit",
    name: "Constellation",
    desc: "Your pawns protect adjacent allies for 2 damage instead of 1.",
    price: 20,
    art: "stars",
  },
  {
    id: "momentum",
    type: "gambit",
    name: "First Light",
    desc: "Your first attack each player phase deals 1 extra damage.",
    price: 22,
    art: "eclipse",
  },
  {
    id: "fractured-crown",
    type: "gambit",
    name: "Fractured Crown",
    desc: "Your king deals 2 extra damage while at half health or below.",
    price: 18,
    art: "crown",
  },
  {
    id: "resonance",
    type: "gambit",
    name: "Resonance",
    desc: "All upgraded pieces deal 1 extra damage.",
    price: 28,
    art: "rings",
  },
];
export const UPGRADES: Item[] = [
  {
    id: "sermon",
    type: "upgrade",
    kind: "bishop",
    name: "Piercing Bishop",
    desc: "Bishop attacks pierce all enemies along the chosen diagonal, up to 3 squares. Allies and missing squares block the attack.",
    price: 24,
    art: "prism",
  },
  {
    id: "fork",
    type: "upgrade",
    kind: "knight",
    name: "Afterimage",
    desc: "After attacking, your knight deals 1 damage to every other enemy adjacent to it.",
    price: 22,
    art: "rings",
  },
  {
    id: "bulwark",
    type: "upgrade",
    kind: "rook",
    name: "Event Horizon",
    desc: "After moving, your rook gains a ward that absorbs 2 damage from its next hit.",
    price: 20,
    art: "eclipse",
  },
  {
    id: "ascension",
    type: "upgrade",
    kind: "pawn",
    name: "Pawn Training",
    desc: "Your pawn gains 2 maximum health and 1 attack.",
    price: 16,
    art: "stars",
  },
];
export const CONSUMABLES: Item[] = [
  {
    id: "trapdoor",
    type: "consumable",
    name: "Fold Space",
    desc: "Link two intact squares. The next piece landing on either swaps their occupants. One use.",
    price: 10,
    art: "rings",
  },
  {
    id: "demolition",
    type: "consumable",
    name: "Unmake",
    desc: "Destroy an empty square for this battle. It blocks movement and beams; knights can jump over it.",
    price: 9,
    art: "fracture",
  },
  {
    id: "repair",
    type: "consumable",
    name: "Second Breath",
    desc: "Restore 4 health to a friendly piece.",
    price: 10,
    art: "sun",
  },
  {
    id: "smoke",
    type: "consumable",
    name: "Veil",
    desc: "A friendly piece ignores its next damaging hit before your next phase.",
    price: 8,
    art: "eclipse",
  },
];
export const HEAL: Item = {
  id: "heal",
  type: "heal",
  name: "Mend the Crown",
  desc: "Restore 5 health to your king.",
  price: 12,
  art: "crown",
};
export const ITEMS = [...GAMBITS, ...UPGRADES, ...CONSUMABLES, HEAL];
export const itemById = (id: string) => ITEMS.find((i) => i.id === id)!;
export type EnemySpawn = [Kind, number, number];
export type Encounter = {
  name: string;
  epithet: string;
  description: string;
  kingHp: number;
  reward: number;
  bonus: string;
  bonusId: string;
  enemies: EnemySpawn[];
  holes: Pos[];
  boss?: boolean;
};
export const ENCOUNTERS: Encounter[] = [
  {
    name: "The Arrival",
    epithet: "OPENING BATTLE",
    description:
      "Capture the enemy king. Keep your pieces alive for the bonus.",
    kingHp: 8,
    reward: 20,
    bonus: "Lose no pieces",
    bonusId: "no-loss",
    enemies: [
      ["pawn", 2, 2],
      ["pawn", 5, 2],
      ["bishop", 4, 1],
      ["rook", 6, 1],
      ["king", 4, 0],
    ],
    holes: [],
  },
  {
    name: "Crossed Signals",
    epithet: "BISHOP ATTACKS",
    description:
      "Enemy bishops cover the approach. Use cover to reach their king.",
    kingHp: 10,
    reward: 24,
    bonus: "Capture with your bishop",
    bonusId: "bishop-kill",
    enemies: [
      ["pawn", 3, 3],
      ["bishop", 1, 1],
      ["bishop", 6, 1],
      ["rook", 4, 2],
      ["king", 4, 0],
    ],
    holes: [{ x: 3, y: 2 }],
  },
  {
    name: "The Offering",
    epithet: "SACRIFICE BONUS",
    description:
      "Two rooks defend the king. Sacrificing your bishop is optional.",
    kingHp: 10,
    reward: 26,
    bonus: "Sacrifice your bishop",
    bonusId: "sacrifice",
    enemies: [
      ["rook", 2, 2],
      ["rook", 5, 1],
      ["pawn", 4, 3],
      ["bishop", 0, 1],
      ["king", 3, 0],
    ],
    holes: [
      { x: 3, y: 3 },
      { x: 4, y: 1 },
    ],
  },
  {
    name: "Broken Geometry",
    epithet: "MISSING SQUARES",
    description: "Use your knight to cross the gaps and reach the king.",
    kingHp: 12,
    reward: 28,
    bonus: "Capture with your knight",
    bonusId: "knight-kill",
    enemies: [
      ["rook", 1, 1],
      ["queen", 5, 1],
      ["pawn", 2, 2],
      ["bishop", 6, 2],
      ["knight", 4, 0],
      ["king", 3, 0],
    ],
    holes: [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 6, y: 4 },
    ],
  },
  {
    name: "The Last Exchange",
    epithet: "FINAL REGULAR BATTLE",
    description:
      "The king has a queen and two rooks. Keep your queen alive for the bonus.",
    kingHp: 14,
    reward: 32,
    bonus: "Keep your queen alive",
    bonusId: "queen-alive",
    enemies: [
      ["queen", 4, 1],
      ["rook", 1, 2],
      ["rook", 6, 2],
      ["bishop", 2, 0],
      ["pawn", 3, 3],
      ["king", 4, 0],
    ],
    holes: [
      { x: 0, y: 3 },
      { x: 7, y: 3 },
    ],
  },
  {
    name: "The Iron Crown",
    epithet: "BOSS BATTLE",
    description:
      "Adjacent guards reduce damage to the Iron Crown by 2. Displace or defeat them to expose the king.",
    kingHp: 20,
    reward: 0,
    bonus: "Keep your king above half health",
    bonusId: "king-health",
    enemies: [
      ["king", 4, 0],
      ["rook", 3, 0],
      ["rook", 5, 0],
      ["bishop", 1, 1],
      ["knight", 6, 2],
      ["pawn", 4, 2],
    ],
    holes: [
      { x: 0, y: 2 },
      { x: 7, y: 2 },
      { x: 3, y: 3 },
    ],
    boss: true,
  },
];
export const STARTERS: [Kind, number, number][] = [
  ["king", 4, 7],
  ["queen", 3, 6],
  ["rook", 1, 6],
  ["bishop", 5, 6],
  ["knight", 6, 5],
  ["pawn", 3, 5],
];
export const SETS = [
  {
    id: "mahogany",
    name: "Mahogany Set",
    subtitle: "MORE KING HEALTH",
    desc: "Start with 18 king health and Queen’s Gambit.",
    detail: "King: 18 health · 26 gold · Queen’s Gambit",
    hp: 18,
    gold: 26,
    gambit: "queens-gambit",
  },
  {
    id: "speed",
    name: "Speed Mat",
    subtitle: "MORE STARTING GOLD",
    desc: "Start with 40 gold and First Light.",
    detail: "King: 13 health · 40 gold · First Light",
    hp: 13,
    gold: 40,
    gambit: "momentum",
  },
] as const;
