import { useState, type CSSProperties } from "react";
import { ABILITY_COST, ROSTER, CreatureId, CATEGORIES } from "../engine";
import { Critter } from "./Critter";
import { catText, type T } from "./i18n";
import { critterText } from "./critterText";

/* The draft pool: a wide quiet pond with a slice of the roster afloat on it,
 * each critter standing on the water. Grab the one you want; the pool fills
 * back in from the wild pile. A reroll spends energy straight from the same
 * bank you use on abilities in the match. */

interface Spot {
  x: number;
  y: number;
  s: number;
}

const SPOTS: Spot[] = [
  { x: 29, y: 25, s: 0.62 },
  { x: 50, y: 22, s: 0.62 },
  { x: 71, y: 26, s: 0.62 },
  { x: 18, y: 43, s: 0.82 },
  { x: 40, y: 41, s: 0.84 },
  { x: 60, y: 42, s: 0.84 },
  { x: 82, y: 44, s: 0.8 },
  { x: 27, y: 60, s: 0.98 },
  { x: 50, y: 59, s: 1.0 },
  { x: 73, y: 61, s: 0.96 },
  { x: 38, y: 76, s: 1.12 },
  { x: 62, y: 77, s: 1.1 },
];

// decorative lily pads (bg svg coords, 800x460); some emit a slow wave ring
const PADS: Array<{ x: number; y: number; r: number; wave?: number }> = [
  { x: 96, y: 150, r: 15, wave: 0 },
  { x: 720, y: 120, r: 13, wave: 2.2 },
  { x: 150, y: 380, r: 17, wave: 4 },
  { x: 690, y: 370, r: 15 },
  { x: 400, y: 100, r: 12, wave: 5.5 },
];

function critterFacts(id: CreatureId): Array<{ k: string; v: string }> {
  const d = ROSTER[id];
  const out: Array<{ k: string; v: string }> = [];
  if (d.moveAdjacent) out.push({ k: "hop", v: `${ABILITY_COST.hop}⚡` });
  if (d.canBurst) out.push({ k: "burst", v: `${ABILITY_COST.extra}⚡` });
  if (d.canWild) out.push({ k: "wild", v: `${ABILITY_COST.wild}⚡` });
  if (d.canMole) out.push({ k: "remove", v: `${ABILITY_COST.replace}⚡` });
  if (d.canMine) out.push({ k: "mine", v: `${ABILITY_COST.mine}⚡` });
  if (d.dormant) {
    const n = d.dormantTurns ?? 1;
    out.push({ k: "rests", v: `${n} turn${n > 1 ? "s" : ""}` });
  }
  if (d.energyBonus) out.push({ k: "stores", v: `${d.energyBonus}⚡` });
  if (!out.length) out.push({ k: "passive", v: "always on" });
  return out;
}

function CritDetail({ id, lang }: { id: CreatureId; lang: string }) {
  const d = ROSTER[id];
  const cat = CATEGORIES[d.category];
  const ci = critterText(lang, id);
  return (
    <div className="crit-detail">
      <div className="cd-head">
        <Critter id={id} size={46} />
        <div>
          <div className="cd-name">{d.name}</div>
          <div className="cd-ep">{ci.epithet}</div>
        </div>
        <span className="type-chip" style={{ background: cat.hue, marginLeft: "auto" }}>
          {catText(lang, d.category).element}
        </span>
      </div>
      <div className="cd-blurb">{ci.blurb}</div>
      <div className="cd-facts">
        {critterFacts(id).map((f) => (
          <span key={f.k} className="cd-fact">
            <i>{f.k}</i> {f.v}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MeadowScene({
  t,
  lang,
  options,
  onPick,
  onReroll,
  rerollCost,
  energyLeft,
  disabled,
  ownerName,
  tint,
}: {
  t: T;
  lang: string;
  options: CreatureId[];
  onPick: (id: CreatureId) => void;
  onReroll: () => void;
  rerollCost: number;
  energyLeft: number;
  disabled?: boolean;
  ownerName: string;
  tint: string;
}) {
  const canReroll = !disabled && energyLeft >= rerollCost;
  const [hover, setHover] = useState<CreatureId | null>(null);
  return (
    <div className="meadow">
      <svg
        className="meadow-bg"
        viewBox="0 0 800 460"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="pool-w" cx="50%" cy="44%" r="66%">
            <stop offset="0" stopColor="#cdeef7" />
            <stop offset="0.55" stopColor="#93d6ec" />
            <stop offset="1" stopColor="#5cb2d8" />
          </radialGradient>
          <linearGradient id="pool-bank" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a7dd82" />
            <stop offset="1" stopColor="#8cca63" />
          </linearGradient>
        </defs>

        <rect width="800" height="460" fill="url(#pool-bank)" />
        <circle cx="694" cy="60" r="32" fill="#fff3ad" opacity="0.7" />
        <g fill="#ffffff" opacity="0.5">
          <ellipse cx="150" cy="66" rx="42" ry="16" />
          <ellipse cx="185" cy="58" rx="28" ry="13" />
        </g>

        {/* the pool */}
        <ellipse cx="400" cy="238" rx="382" ry="210" fill="#69bfa0" opacity="0.3" />
        <ellipse cx="400" cy="230" rx="366" ry="196" fill="url(#pool-w)" />
        <ellipse cx="400" cy="140" rx="270" ry="72" fill="#ffffff" opacity="0.1" />

        {/* drifting surface ripples */}
        <g stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.3">
          <path d="M120 250 q60 16 130 0">
            <animate
              attributeName="d"
              dur="7s"
              repeatCount="indefinite"
              values="M120 250 q60 16 130 0; M120 254 q60 -14 130 2; M120 250 q60 16 130 0"
            />
          </path>
          <path d="M470 320 q80 18 170 -2">
            <animate
              attributeName="d"
              dur="9s"
              repeatCount="indefinite"
              values="M470 320 q80 18 170 -2; M470 316 q80 -16 170 4; M470 320 q80 18 170 -2"
            />
          </path>
        </g>

        {/* reeds around the rim */}
        <g stroke="#4d8f3f" strokeWidth="5" strokeLinecap="round">
          <path d="M56 298 V232 M70 298 V222 M84 300 V240" />
          <path d="M724 300 V240 M738 300 V228 M752 302 V248" />
        </g>

        {/* decorative lily pads, some emitting a slow wave */}
        {PADS.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            {p.wave != null && (
              <circle r="0" fill="none" stroke="#ffffff" strokeWidth="2">
                <animate
                  attributeName="r"
                  from="6"
                  to={p.r + 26}
                  dur="4.5s"
                  begin={`${p.wave}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.55"
                  to="0"
                  dur="4.5s"
                  begin={`${p.wave}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <ellipse cx="0" cy="3" rx={p.r} ry={p.r * 0.5} fill="#1f6f8f" opacity="0.15" />
            <path
              d={`M${p.r} 0 A${p.r} ${p.r * 0.62} 0 1 1 ${p.r * 0.28} ${-p.r * 0.44} L0 0 Z`}
              fill="#5fb45a"
              stroke="#3f8f42"
              strokeWidth="1.6"
            />
            <path
              d={`M0 0 l${p.r * 0.5} ${-p.r * 0.22}`}
              stroke="#3f8f42"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* a lily flower + a couple of drifting leaves + a fish shadow */}
        <g transform="translate(596 100)">
          <path d="M0 0 q-7 -10 0 -16 q7 6 0 16z" fill="#ffd9e6" />
          <path d="M0 0 q-10 -4 -13 -13 q10 1 13 13z" fill="#ffc3d8" />
          <path d="M0 0 q10 -4 13 -13 q-10 1 -13 13z" fill="#ffc3d8" />
          <circle r="3" fill="#ffe9a8" />
        </g>
        <g fill="#e7b15a" opacity="0.75">
          <ellipse cx="160" cy="330" rx="8" ry="4" transform="rotate(20 160 330)" />
          <ellipse cx="470" cy="200" rx="7" ry="3.5" transform="rotate(-12 470 200)" />
        </g>
        <g fill="#3f7d9a" opacity="0.28">
          <path d="M300 250 q14 -8 30 0 q-8 6 -30 8 z">
            <animateTransform
              attributeName="transform"
              type="translate"
              dur="12s"
              repeatCount="indefinite"
              values="0 0; 120 26; 0 0"
            />
          </path>
        </g>

        {/* dragonfly */}
        <g transform="translate(520 84)">
          <animateTransform
            attributeName="transform"
            type="translate"
            dur="10s"
            repeatCount="indefinite"
            values="520 84; 470 108; 540 96; 520 84"
          />
          <path d="M0 0 q-14 -5 -18 0 q14 5 18 0z" fill="#9be3e0" opacity="0.85" />
          <path d="M0 0 q14 -5 18 0 q-14 5 -18 0z" fill="#9be3e0" opacity="0.85" />
          <rect x="-1" y="-1" width="14" height="2.5" rx="1.2" fill="#3f7d7a" />
        </g>
      </svg>

      <div className="meadow-tag" style={{ background: tint }}>
        {ownerName}, {t("grabAFriend")}
      </div>

      <div
        className="meadow-tokens"
        style={{ borderColor: tint }}
        title={t("energy")}
      >
        <span className="mt-diamonds" style={{ color: tint }}>
          {energyLeft}⚡
        </span>
        <span className="mt-word">{t("energy")}</span>
      </div>

      {options.map((id, i) => {
        const sp = SPOTS[i] ?? SPOTS[SPOTS.length - 1];
        return (
          <div
            key={id}
            className="meadow-pick"
            style={
              { left: `${sp.x}%`, top: `${sp.y}%`, "--s": sp.s } as CSSProperties
            }
          >
            <button
              className="mp-draft"
              disabled={disabled}
              onClick={() => onPick(id)}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover((h) => (h === id ? null : h))}
              onFocus={() => setHover(id)}
              onBlur={() => setHover((h) => (h === id ? null : h))}
            >
              <span className="mp-ripple" />
              <Critter id={id} size={104} />
            </button>
          </div>
        );
      })}

      <div className="meadow-labels">
        {options.map((id, i) => {
          const sp = SPOTS[i] ?? SPOTS[SPOTS.length - 1];
          return (
            <span
              key={id}
              className="mp-name"
              style={
                {
                  left: `${sp.x}%`,
                  top: `${sp.y}%`,
                  "--s": sp.s,
                  background: CATEGORIES[ROSTER[id].category].hue,
                } as CSSProperties
              }
            >
              {ROSTER[id].name}
            </span>
          );
        })}
      </div>

      {hover && <CritDetail id={hover} lang={lang} />}

      <button
        className="pool-reroll"
        onClick={onReroll}
        disabled={!canReroll}
      >
        <span className="pr-title">↻ {t("rerollPool")}</span>
        <span className="pr-cost">
          {t("costs")} {rerollCost}⚡
        </span>
      </button>
    </div>
  );
}
