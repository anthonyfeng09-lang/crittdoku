import { useState, type CSSProperties } from "react";
import { ABILITY_COST, ROSTER, CreatureId, CATEGORIES } from "../engine";
import { Critter } from "./Critter";

/** the numbers a drafter cares about: ability cost, rest turns, stored energy */
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

function CritDetail({ id }: { id: CreatureId }) {
  const d = ROSTER[id];
  const cat = CATEGORIES[d.category];
  return (
    <div className="crit-detail">
      <div className="cd-head">
        <Critter id={id} size={46} />
        <div>
          <div className="cd-name">{d.name}</div>
          <div className="cd-ep">{d.epithet}</div>
        </div>
        <span className="type-chip" style={{ background: cat.hue, marginLeft: "auto" }}>
          {cat.element}
        </span>
      </div>
      <div className="cd-blurb">{d.blurb}</div>
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

/* The draft pool: a quiet pond with the available critters afloat on lily
 * pads. Grab the one you want and it hops ashore; the water fills back in.
 * Spend a forage token to let one slip under and call another up. */

interface Spot {
  x: number;
  y: number;
  s: number;
}

// pads sit on the water: smaller and higher toward the far bank
const SPOTS: Spot[] = [
  { x: 32, y: 33, s: 0.72 },
  { x: 51, y: 30, s: 0.72 },
  { x: 69, y: 34, s: 0.72 },
  { x: 18, y: 51, s: 0.95 },
  { x: 44, y: 52, s: 1.0 },
  { x: 80, y: 49, s: 0.9 },
  { x: 29, y: 66, s: 1.16 },
  { x: 64, y: 66, s: 1.14 },
];

function LilyPad() {
  return (
    <svg className="mp-pad" viewBox="0 0 100 60" aria-hidden="true">
      <ellipse cx="50" cy="52" rx="42" ry="9" fill="#1f6f8f" opacity="0.28" />
      <path
        d="M50 46 C22 46 10 34 10 22 C10 10 28 4 50 4 C72 4 90 10 90 22 C90 34 78 46 50 46 Z"
        fill="#5fb45a"
        stroke="#3f8f42"
        strokeWidth="2.5"
      />
      <path d="M50 24 L74 12" stroke="#3f8f42" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="40" cy="18" rx="14" ry="6" fill="#7cc46f" opacity="0.7" />
    </svg>
  );
}

export function MeadowScene({
  options,
  onPick,
  onReroll,
  rerollCost,
  forageLeft,
  maxForage,
  disabled,
  ownerName,
  tint,
}: {
  options: CreatureId[];
  onPick: (id: CreatureId) => void;
  onReroll: () => void;
  rerollCost: number;
  forageLeft: number;
  maxForage: number;
  disabled?: boolean;
  ownerName: string;
  tint: string;
}) {
  const canReroll = !disabled && forageLeft >= rerollCost;
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
          <radialGradient id="pool-w" cx="50%" cy="42%" r="62%">
            <stop offset="0" stopColor="#bfe9f5" />
            <stop offset="0.6" stopColor="#8fd3ec" />
            <stop offset="1" stopColor="#5fb6da" />
          </radialGradient>
          <linearGradient id="pool-bank" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a7dd82" />
            <stop offset="1" stopColor="#8cca63" />
          </linearGradient>
        </defs>

        {/* grassy bank */}
        <rect width="800" height="460" fill="url(#pool-bank)" />
        <circle cx="690" cy="66" r="34" fill="#fff3ad" opacity="0.7" />

        {/* the pool */}
        <ellipse cx="400" cy="238" rx="366" ry="196" fill="#6cbfa0" opacity="0.35" />
        <ellipse cx="400" cy="232" rx="348" ry="182" fill="url(#pool-w)" />
        <ellipse cx="400" cy="150" rx="250" ry="70" fill="#ffffff" opacity="0.12" />
        {/* ripples */}
        <g stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.35">
          <path d="M180 300 q60 18 120 0" />
          <path d="M470 320 q70 18 150 -2" />
          <path d="M300 190 q50 12 100 0" />
        </g>

        {/* reeds / cattails around the rim */}
        <g strokeLinecap="round">
          <g stroke="#4d8f3f" strokeWidth="5">
            <path d="M64 300 V236 M78 300 V226 M92 300 V244" />
            <path d="M724 300 V240 M738 300 V228 M752 300 V248" />
          </g>
          <g fill="#7c5a3a">
            <rect x="74" y="212" width="8" height="20" rx="4" />
            <rect x="734" y="216" width="8" height="20" rx="4" />
          </g>
        </g>

        {/* a couple of empty pads + lily flowers so the pool feels lived-in */}
        <g>
          <ellipse cx="250" cy="118" rx="26" ry="9" fill="#5fb45a" stroke="#3f8f42" strokeWidth="2" />
          <path d="M250 113 l14 -6" stroke="#3f8f42" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="565" cy="130" rx="22" ry="8" fill="#5fb45a" stroke="#3f8f42" strokeWidth="2" />
          <g transform="translate(600 96)">
            <path d="M0 0 q-7 -10 0 -16 q7 6 0 16z" fill="#ffd9e6" />
            <path d="M0 0 q-10 -4 -13 -13 q10 1 13 13z" fill="#ffc3d8" />
            <path d="M0 0 q10 -4 13 -13 q-10 1 -13 13z" fill="#ffc3d8" />
            <circle r="3" fill="#ffe9a8" />
          </g>
        </g>

        {/* floating leaves */}
        <g fill="#e7b15a" opacity="0.8">
          <ellipse cx="150" cy="330" rx="9" ry="4" transform="rotate(20 150 330)" />
          <ellipse cx="640" cy="360" rx="8" ry="4" transform="rotate(-15 640 360)" />
        </g>

        {/* dragonfly */}
        <g transform="translate(520 92)">
          <path d="M0 0 q-14 -5 -18 0 q14 5 18 0z" fill="#9be3e0" opacity="0.85" />
          <path d="M0 0 q14 -5 18 0 q-14 5 -18 0z" fill="#9be3e0" opacity="0.85" />
          <rect x="-1" y="-1" width="14" height="2.5" rx="1.2" fill="#3f7d7a" />
        </g>
      </svg>

      <div className="meadow-tag" style={{ background: tint }}>
        {ownerName}, grab a friend
      </div>

      {/* persistent forage-token badge */}
      <div className="meadow-tokens" style={{ borderColor: tint }} title="forage tokens: spend one to reroll the pool">
        <span className="mt-diamonds" style={{ color: tint }}>
          {"◆".repeat(forageLeft)}
          {"◇".repeat(Math.max(0, maxForage - forageLeft))}
        </span>
        <span className="mt-word">forage</span>
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
              <LilyPad />
              <Critter id={id} size={104} />
            </button>
          </div>
        );
      })}

      {hover && <CritDetail id={hover} />}

      {/* names in their own layer so no lily pad can cover them */}
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

      <button
        className="pool-reroll"
        onClick={onReroll}
        disabled={!canReroll}
        title={
          canReroll
            ? "send this pool under and call up a fresh one"
            : "not enough forage tokens"
        }
      >
        <span className="pr-title">↻ Reroll pool</span>
        <span className="pr-cost">
          {rerollCost} forage token{rerollCost === 1 ? "" : "s"} &middot;{" "}
          {"◆".repeat(forageLeft)}
          {"◇".repeat(Math.max(0, 3 - forageLeft))} left
        </span>
      </button>
    </div>
  );
}
