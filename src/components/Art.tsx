import { useId } from "react";
export function Art({
  type = "eclipse",
  className = "",
}: {
  type?: string;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className={"artifact-art " + className}
      viewBox="0 0 220 132"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={id}>
          <stop
            stopColor={type === "blood" ? "#9b5354" : "#568985"}
            stopOpacity=".35"
          />
          <stop offset="1" stopColor="#07131d" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={id + "g"}
          x1="60"
          y1="10"
          x2="160"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f1dfb6" />
          <stop offset="1" stopColor="#759e9c" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="69" rx="94" ry="66" fill={"url(#" + id + ")"} />
      <g stroke="#b2a88f" strokeWidth=".5" opacity=".35">
        <circle cx="110" cy="65" r="51" />
        <ellipse
          cx="110"
          cy="65"
          rx="82"
          ry="22"
          transform="rotate(-22 110 65)"
        />
        <path d="M110 2v126M20 65h180" />
        <path d="M51 23l118 84M52 107l117-84" />
      </g>
      <g stroke={"url(#" + id + "g)"} strokeWidth="1.6" strokeLinejoin="round">
        {type === "crown" ? (
          <>
            <path
              d="M75 88l-9-45 27 19 17-31 17 31 27-19-9 45z"
              fill="#193039"
            />
            <path d="M77 95h66M80 103h60M73 79h74" />
            <circle cx="110" cy="18" r="6" />
            <path d="M98 38l-5 24M127 62l-5-24" />
          </>
        ) : type === "blood" ? (
          <>
            <path
              d="M82 39h56c0 25-12 33-28 36-16-3-28-11-28-36Z"
              fill="#3c242e"
            />
            <path d="M110 75v28M91 105h38M87 45h46" />
            <path d="M110 13c-17 21-10 25 0 25s17-4 0-25Z" fill="#b76a63" />
            <path d="M102 77l-9 17M118 77l9 17" />
          </>
        ) : type === "stairs" ? (
          <>
            <path
              d="M67 103V85h17V67h17V49h17V31h17V13l19 11v18h-17v18h-17v18h-17v18H86v18Z"
              fill="#243d45"
            />
            <path d="M67 85l19 11M84 67l19 11M101 49l19 11M118 31l19 11M135 13l19 11" />
          </>
        ) : type === "prism" ? (
          <>
            <path d="M110 24l38 65H72z" fill="#183d47" />
            <path
              d="M110 24v51l38 14M110 75L72 89M22 68l74-6 15 12 78-36"
              stroke="#84ccca"
            />
            <path d="M112 73l78 8M113 75l65 32" stroke="#d4887d" />
          </>
        ) : type === "stars" ? (
          <>
            <path d="M67 92l15-57 46-14 33 57-40 31zM82 35l39 74 7-88M67 92l94-14M82 35l79 43" />
            {[
              [67, 92],
              [82, 35],
              [128, 21],
              [161, 78],
              [121, 109],
            ].map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={i === 2 ? 6 : 4}
                fill="#d4d7bd"
              />
            ))}
          </>
        ) : type === "fracture" ? (
          <>
            <path d="M65 50l40-23 46 26-7 42-38 20-42-26Z" fill="#12262e" />
            <path d="M105 27l11 27-19 19 14 15-5 27M65 50l32 23-33 16M116 54l35-1" />
            <path
              d="M106 42l10 12-19 19 14 15"
              stroke="#c790c0"
              strokeWidth="3"
            />
          </>
        ) : type === "sun" ? (
          <>
            <circle cx="110" cy="65" r="26" fill="#1d343a" />
            <circle cx="110" cy="65" r="18" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6;
              return (
                <path
                  key={i}
                  d={
                    "M" +
                    (110 + Math.cos(a) * 34) +
                    " " +
                    (65 + Math.sin(a) * 34) +
                    "L" +
                    (110 + Math.cos(a) * 44) +
                    " " +
                    (65 + Math.sin(a) * 44)
                  }
                />
              );
            })}
            <path d="M110 54v22M99 65h22" stroke="#d8dabd" />
          </>
        ) : type === "rings" ? (
          <>
            <ellipse
              cx="97"
              cy="65"
              rx="24"
              ry="40"
              transform="rotate(35 97 65)"
            />
            <ellipse
              cx="123"
              cy="65"
              rx="24"
              ry="40"
              transform="rotate(-35 123 65)"
            />
            <circle cx="110" cy="65" r="6" fill="#b0d8c9" />
          </>
        ) : (
          <>
            <circle cx="110" cy="65" r="32" fill="#07131d" />
            <path
              d="M92 37a32 32 0 1 1 0 56"
              stroke="#f3d6a4"
              strokeWidth="3"
            />
            <circle cx="159" cy="32" r="4" fill="#a2c9bd" />
            <path d="M66 109l11-10" />
          </>
        )}
      </g>
      <g fill="#c6b596">
        <circle cx="39" cy="32" r="1" />
        <circle cx="178" cy="91" r="1.3" />
        <circle cx="167" cy="18" r="1" />
        <circle cx="52" cy="106" r="1" />
      </g>
    </svg>
  );
}
