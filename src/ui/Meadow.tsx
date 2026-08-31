import { type CSSProperties } from "react";
import { ROSTER, CreatureId, CATEGORIES } from "../engine";
import { Critter } from "./Critter";

/* The draft meadow: a little wildlife scene with the creatures on offer
 * scattered around it, each idling in its own pose. Pick one, or pay a
 * forage token to call a fresh set out of the grass. */

interface Spot {
  x: number;
  y: number;
  s: number;
}

const SPOTS: Spot[] = [
  { x: 28, y: 71, s: 1.16 },
  { x: 55, y: 75, s: 1.22 },
  { x: 78, y: 69, s: 1.04 },
  { x: 22, y: 43, s: 0.9 },
  { x: 50, y: 37, s: 0.88 },
  { x: 77, y: 43, s: 0.9 },
];

const FLOWERS: Array<[number, number, number]> = [
  [180, 360, 0],
  [330, 402, 1],
  [500, 380, 2],
  [610, 358, 0],
  [410, 430, 1],
  [720, 402, 2],
];

export function MeadowScene({
  options,
  onPick,
  disabled,
  ownerName,
  tint,
}: {
  options: CreatureId[];
  onPick: (id: CreatureId) => void;
  disabled?: boolean;
  ownerName: string;
  tint: string;
}) {
  return (
    <div className="meadow">
      <svg
        className="meadow-bg"
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mdw-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dcf0ff" />
            <stop offset="1" stopColor="#f6ffee" />
          </linearGradient>
        </defs>
        <rect width="800" height="450" fill="url(#mdw-sky)" />
        <circle cx="672" cy="78" r="40" fill="#fff2ac" opacity="0.85" />
        <g fill="#ffffff" opacity="0.75">
          <ellipse cx="150" cy="90" rx="46" ry="20" />
          <ellipse cx="185" cy="80" rx="34" ry="18" />
          <ellipse cx="470" cy="60" rx="40" ry="17" />
        </g>
        <path d="M0 300 Q 200 240 400 292 T 800 272 V450 H0 Z" fill="#bfe7a4" />
        <path d="M0 350 Q 250 300 500 348 T 800 330 V450 H0 Z" fill="#a1d982" />
        <path d="M0 402 Q 300 372 600 402 T 800 396 V450 H0 Z" fill="#8bcd6a" />
        <ellipse cx="250" cy="414" rx="150" ry="32" fill="#a9dcf0" opacity="0.9" />
        <ellipse cx="240" cy="408" rx="116" ry="22" fill="#c9edf8" opacity="0.7" />
        <g>
          <rect x="92" y="250" width="18" height="72" rx="6" fill="#b07a54" />
          <circle cx="101" cy="236" r="46" fill="#92d46d" />
          <circle cx="72" cy="254" r="30" fill="#7ec65b" />
          <circle cx="130" cy="254" r="30" fill="#7ec65b" />
        </g>
        <g>
          <rect x="700" y="268" width="14" height="60" rx="5" fill="#b07a54" />
          <circle cx="707" cy="258" r="33" fill="#9cdb78" />
        </g>
        <g fill="#7ec65b">
          <ellipse cx="430" cy="360" rx="40" ry="20" />
          <ellipse cx="560" cy="420" rx="56" ry="24" />
          <ellipse cx="70" cy="404" rx="46" ry="20" />
        </g>
        {FLOWERS.map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="5" fill={["#ffd1e8", "#fff3b0", "#dcccff"][c]} />
            <circle r="2" fill="#ffffff" />
          </g>
        ))}
      </svg>

      <div className="meadow-tag" style={{ background: tint }}>
        {ownerName}, choose a friend
      </div>

      {options.map((id, i) => {
        const sp = SPOTS[i] ?? SPOTS[SPOTS.length - 1];
        return (
          <button
            key={id}
            className="meadow-pick"
            style={
              { left: `${sp.x}%`, top: `${sp.y}%`, "--s": sp.s } as CSSProperties
            }
            disabled={disabled}
            onClick={() => onPick(id)}
            title={ROSTER[id].blurb}
          >
            <span className="mp-pad" />
            <Critter id={id} size={104} />
            <span
              className="mp-name"
              style={{ background: CATEGORIES[ROSTER[id].category].hue }}
            >
              {ROSTER[id].name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
