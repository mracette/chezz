import type { Kind, Side } from "../game/exile";

/** Small original vector characters: readable chess crests over silly soldiers. */
export function PieceArt({ kind, side }: { kind: Kind; side: Side }) {
  const coat = side === "white" ? "#ead5a5" : "#c86d62";
  const trim = side === "white" ? "#749c83" : "#6c4554";
  return <svg className="piece-art" viewBox="0 0 100 118" aria-hidden="true">
    <ellipse cx="50" cy="109" rx="29" ry="6" fill="#382f2e" opacity=".22" />
    <g stroke="#382f2e" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M29 79L24 105L41 106L45 87M63 80L69 105L52 107L48 88" fill={trim} />
      <path d="M25 58Q49 45 76 58L82 88Q51 105 18 88Z" fill={coat} />
      <path d="M21 63L12 83L22 88M78 64L88 81L77 89" fill={coat} />
      <path d="M29 73Q50 80 71 73L72 83Q50 91 28 83Z" fill={trim} />
      <rect x="44" y="77" width="13" height="9" rx="2" fill="#e2b45d" />
      {kind === "knight" ? <><path d="M25 53L30 21L41 29L49 18Q73 24 72 46L83 50L78 65L60 67L54 54L43 65Z" fill={coat} /><path d="M36 31L29 57M53 24L65 29M55 38L58 38" /><path d="M72 53L75 54" /></> : <>
        <path d="M27 32Q50 16 73 33L71 57Q48 75 29 57Z" fill="#efbb91" />
        <path d="M35 46L42 46M58 46L65 46" />
        <path d="M46 52Q54 48 58 55Q50 62 45 55Z" fill="#d58373" />
        <path d="M43 62L58 63" />
        {kind === "king" && <><path d="M24 28L20 10L37 17L50 4L62 17L80 10L74 30Z" fill="#e7ba58" /><path d="M33 38L43 42M58 42L68 37" /><path d="M31 59L36 72L46 65L54 74L67 59" fill="#b89971" /><path d="M14 79L8 42L16 44L24 77" fill="#b2c3bd" /></>}
        {kind === "pawn" && <><path d="M23 34Q22 10 49 12Q78 13 76 35Z" fill={trim} /><path d="M30 32L70 32" /></>}
        {kind === "rook" && <path d="M24 33L24 9L35 9L35 18L44 18L44 9L55 9L55 18L65 18L65 9L77 9L76 34Z" fill={trim} />}
        {kind === "bishop" && <><path d="M25 33Q27 12 50 2Q73 15 76 33Z" fill={trim} /><path d="M50 8L43 23" stroke="#ead5a5" /></>}
        {kind === "queen" && <><path d="M26 29L22 10L38 19L49 3L62 19L78 10L73 30Z" fill="#e7ba58" /><path d="M26 35L21 58L28 65M73 36L79 58L70 66" fill="#b89971" /></>}
      </>}
    </g>
  </svg>;
}
