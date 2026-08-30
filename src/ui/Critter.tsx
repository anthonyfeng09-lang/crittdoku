import { CATEGORIES, ROSTER, CreatureId } from "../engine";

/* Original full-body critters, drawn from a small parts kit so the roster
 * can keep growing. Nothing here is copied from any existing franchise. */

type Build = "round" | "stout" | "tall" | "pup";
type Feature =
  | "none"
  | "ears"
  | "horn"
  | "leaf"
  | "antenna"
  | "fins"
  | "shell"
  | "spikes"
  | "tuft"
  | "wings";

interface Spec {
  build: Build;
  feature: Feature;
  /** darker shade for outlines / limbs / feature */
  dark: string;
}

const SPEC: Record<CreatureId, Spec> = {
  boulderpup: { build: "pup", feature: "ears", dark: "#15803d" },
  mossback: { build: "stout", feature: "leaf", dark: "#166534" },
  slumberstone: { build: "round", feature: "tuft", dark: "#15803d" },

  breezefinch: { build: "tall", feature: "wings", dark: "#0e7490" },
  tumbleweed: { build: "round", feature: "spikes", dark: "#0e7490" },
  glidewing: { build: "tall", feature: "wings", dark: "#0e7490" },

  snoozemouse: { build: "pup", feature: "ears", dark: "#7e22ce" },
  fogkit: { build: "round", feature: "tuft", dark: "#7e22ce" },
  dozderling: { build: "round", feature: "antenna", dark: "#7e22ce" },

  nutsquirrel: { build: "tall", feature: "tuft", dark: "#b45309" },
  acorncache: { build: "stout", feature: "leaf", dark: "#b45309" },
  sunbeetle: { build: "round", feature: "horn", dark: "#b45309" },
  tallykit: { build: "tall", feature: "antenna", dark: "#b45309" },

  pricklehog: { build: "stout", feature: "spikes", dark: "#be123c" },
  shellclam: { build: "round", feature: "shell", dark: "#be123c" },
  barknewt: { build: "tall", feature: "fins", dark: "#be123c" },
  thornpod: { build: "round", feature: "spikes", dark: "#be123c" },
  quillhog: { build: "stout", feature: "spikes", dark: "#be123c" },

  swiftwren: { build: "tall", feature: "wings", dark: "#c2410c" },
  digmole: { build: "stout", feature: "horn", dark: "#c2410c" },
  wildlark: { build: "tall", feature: "antenna", dark: "#c2410c" },
  bombkit: { build: "round", feature: "horn", dark: "#c2410c" },
};

interface Geo {
  /** body ellipse */
  bx: number;
  by: number;
  brx: number;
  bry: number;
  /** head circle */
  hx: number;
  hy: number;
  hr: number;
  /** foot y */
  fy: number;
}

function geoFor(build: Build): Geo {
  switch (build) {
    case "stout":
      return { bx: 50, by: 62, brx: 30, bry: 24, hx: 50, hy: 40, hr: 20, fy: 88 };
    case "tall":
      return { bx: 50, by: 62, brx: 20, bry: 27, hx: 50, hy: 32, hr: 19, fy: 92 };
    case "pup":
      return { bx: 50, by: 66, brx: 25, bry: 20, hx: 50, hy: 40, hr: 22, fy: 88 };
    default:
      return { bx: 50, by: 58, brx: 26, bry: 26, hx: 50, hy: 44, hr: 24, fy: 88 };
  }
}

function feature(f: Feature, g: Geo, dark: string, fill: string) {
  const { hx, hy, hr } = g;
  switch (f) {
    case "ears":
      return (
        <g fill={fill} stroke={dark} strokeWidth="2">
          <ellipse cx={hx - hr * 0.7} cy={hy - hr * 0.8} rx="8" ry="11" />
          <ellipse cx={hx + hr * 0.7} cy={hy - hr * 0.8} rx="8" ry="11" />
        </g>
      );
    case "horn":
      return (
        <path
          d={`M${hx} ${hy - hr + 2} l-6 -14 h12 z`}
          fill={dark}
        />
      );
    case "leaf":
      return (
        <g fill={dark}>
          <path d={`M${hx} ${hy - hr} q-4 -16 -16 -18 q2 14 16 18 z`} />
          <path d={`M${hx} ${hy - hr} q4 -16 16 -18 q-2 14 -16 18 z`} />
        </g>
      );
    case "antenna":
      return (
        <g stroke={dark} strokeWidth="3" strokeLinecap="round" fill={dark}>
          <line x1={hx} y1={hy - hr} x2={hx - 8} y2={hy - hr - 14} />
          <circle cx={hx - 8} cy={hy - hr - 15} r="4" stroke="none" />
        </g>
      );
    case "fins":
      return (
        <g fill={dark}>
          <path d={`M${hx - hr} ${hy} q-12 -4 -14 8 q10 4 14 -2 z`} />
          <path d={`M${hx + hr} ${hy} q12 -4 14 8 q-10 4 -14 -2 z`} />
        </g>
      );
    case "shell":
      return (
        <path
          d={`M${g.bx - g.brx} ${g.by} A${g.brx} ${g.bry} 0 0 1 ${g.bx + g.brx} ${g.by} Z`}
          fill={dark}
          opacity="0.45"
        />
      );
    case "spikes":
      return (
        <g fill={dark}>
          {[-0.7, -0.25, 0.25, 0.7].map((t, i) => (
            <path
              key={i}
              d={`M${g.bx + t * g.brx} ${g.by - g.bry + 4} l-5 -12 l10 0 z`}
            />
          ))}
        </g>
      );
    case "tuft":
      return (
        <path
          d={`M${hx - 10} ${hy - hr + 4} q10 -20 20 0 q-10 -8 -20 0 z`}
          fill={dark}
        />
      );
    case "wings":
      return (
        <g fill={fill} stroke={dark} strokeWidth="2" opacity="0.95">
          <path d={`M${g.bx - g.brx + 4} ${g.by} q-22 -10 -24 10 q16 8 24 0 z`} />
          <path d={`M${g.bx + g.brx - 4} ${g.by} q22 -10 24 10 q-16 8 -24 0 z`} />
        </g>
      );
    default:
      return null;
  }
}

export function Critter({ id, size = 44 }: { id: CreatureId; size?: number }) {
  const spec = SPEC[id];
  const fill = CATEGORIES[ROSTER[id].category].hue;
  const g = geoFor(spec.build);
  const belly = "#ffffff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={ROSTER[id].name}
    >
      <ellipse cx="50" cy="94" rx="24" ry="4" fill="#0000001a" />

      {feature(spec.feature, g, spec.dark, fill)}

      {/* legs + feet */}
      <g fill={spec.dark}>
        <rect x={g.bx - 14} y={g.by + g.bry - 6} width="9" height="14" rx="4" />
        <rect x={g.bx + 5} y={g.by + g.bry - 6} width="9" height="14" rx="4" />
        <ellipse cx={g.bx - 9} cy={g.fy} rx="8" ry="5" />
        <ellipse cx={g.bx + 10} cy={g.fy} rx="8" ry="5" />
      </g>

      {/* arms */}
      <g fill={fill} stroke={spec.dark} strokeWidth="2">
        <ellipse cx={g.bx - g.brx - 1} cy={g.by} rx="7" ry="9" />
        <ellipse cx={g.bx + g.brx + 1} cy={g.by} rx="7" ry="9" />
      </g>

      {/* body */}
      <ellipse
        cx={g.bx}
        cy={g.by}
        rx={g.brx}
        ry={g.bry}
        fill={fill}
        stroke={spec.dark}
        strokeWidth="2.5"
      />
      <ellipse
        cx={g.bx}
        cy={g.by + 3}
        rx={g.brx * 0.55}
        ry={g.bry * 0.7}
        fill={belly}
        opacity="0.55"
      />

      {/* head */}
      <circle
        cx={g.hx}
        cy={g.hy}
        r={g.hr}
        fill={fill}
        stroke={spec.dark}
        strokeWidth="2.5"
      />

      {/* face */}
      <g fill="#241b2e">
        <circle cx={g.hx - g.hr * 0.36} cy={g.hy - 1} r="3" />
        <circle cx={g.hx + g.hr * 0.36} cy={g.hy - 1} r="3" />
      </g>
      <circle cx={g.hx - g.hr * 0.36 + 1} cy={g.hy - 2} r="1" fill="#fff" />
      <circle cx={g.hx + g.hr * 0.36 + 1} cy={g.hy - 2} r="1" fill="#fff" />
      <path
        d={`M${g.hx - 6} ${g.hy + g.hr * 0.34} q6 6 12 0`}
        fill="none"
        stroke="#241b2e"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <ellipse
        cx={g.hx - g.hr * 0.62}
        cy={g.hy + g.hr * 0.32}
        rx="4"
        ry="2.5"
        fill="#fff"
        opacity="0.35"
      />
      <ellipse
        cx={g.hx + g.hr * 0.62}
        cy={g.hy + g.hr * 0.32}
        rx="4"
        ry="2.5"
        fill="#fff"
        opacity="0.35"
      />

      {/* a soft top highlight */}
      <ellipse
        cx={g.hx - g.hr * 0.3}
        cy={g.hy - g.hr * 0.55}
        rx={g.hr * 0.35}
        ry={g.hr * 0.22}
        fill="#fff"
        opacity="0.3"
      />
    </svg>
  );
}
