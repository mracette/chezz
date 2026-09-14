import type { Piece } from "../game/engine";
import { PIECES } from "../game/content";

export type Forecast = { piece: Piece; after: number };

function Portrait({ piece }: { piece: Piece }) {
  const shapes = {
    pawn: "M38 40a12 12 0 1 1 24 0a12 12 0 1 1-24 0M40 56h20l-5 10 7 14H38l7-14z",
    rook: "M30 25h10v9h7v-9h7v9h7v-9h10v22H30z M36 48h28v31H36z",
    knight: "M33 79l6-22-12-4 8-22 17-10 3-10 8 14 8 17-5 37z M39 42l7-3",
    bishop:
      "M50 15Q23 39 38 52h24Q77 39 50 15z M56 23l-9 18 M40 58h20l-5 10 8 12H37l8-12z",
    queen: "M29 29l9 8 12-19 12 19 9-8-6 24H35z M38 58h24l-6 10 7 12H37l7-12z",
    king: "M46 13h8v9h10v8H54v13h-8V30H36v-8h10z M33 46h34l-7 13H40z M42 63h16l5 17H37z",
  };
  return (
    <svg
      className="target-portrait"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${PIECES[piece.kind].name} portrait`}
    >
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="#251d2b"
        stroke="#fa7766"
        strokeOpacity=".5"
      />
      <circle
        cx="50"
        cy="50"
        r="37"
        fill="none"
        stroke="#fa7766"
        strokeOpacity=".15"
      />
      <path
        d={shapes[piece.kind]}
        fill="#f2c4b5"
        stroke="#ffebdc"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M32 83h36l5 7H27z" fill="#c98275" />
    </svg>
  );
}

export function AttackPreview({
  forecast,
  targetId,
}: {
  forecast: Forecast[];
  targetId: string;
}) {
  const target = forecast.find((f) => f.piece.id === targetId)!;
  const ordered = [target, ...forecast.filter((f) => f !== target)];
  return (
    <section
      className="attack-forecast"
      aria-label="Attack preview"
      aria-live="polite"
    >
      <div className="forecast-heading">
        <Portrait piece={target.piece} />
        <div>
          <span className="eyebrow">ATTACK PREVIEW</span>
          <h3>{PIECES[target.piece.kind].name}</h3>
          <strong className={target.after === 0 ? "lethal" : ""}>
            {target.after === 0
              ? "LETHAL"
              : target.after === target.piece.hp
                ? "BLOCKED"
                : `−${target.piece.hp - target.after} HP`}
          </strong>
        </div>
      </div>
      {ordered.map(({ piece, after }) => (
        <div className="forecast-health" key={piece.id}>
          <div>
            <span>
              {piece.id === targetId ? "HP" : PIECES[piece.kind].name}
            </span>
            <b>
              {piece.hp} → {after} <small>/ {piece.maxHp}</small>
            </b>
          </div>
          <div
            className="forecast-bar"
            role="img"
            aria-label={`${PIECES[piece.kind].name}: ${piece.hp} to ${after} health${after === 0 ? ", lethal" : ""}`}
          >
            <i
              className="forecast-remaining"
              style={{ width: `${(after / piece.maxHp) * 100}%` }}
            />
            <i
              className="forecast-loss"
              style={{
                left: `${(after / piece.maxHp) * 100}%`,
                width: `${((piece.hp - after) / piece.maxHp) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
