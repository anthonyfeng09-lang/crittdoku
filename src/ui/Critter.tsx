import { type ReactNode } from "react";
import { CATEGORIES, ROSTER, CreatureId, Category } from "../engine";

/* Original full-body critters. A compact parts kit gives each one a distinct
 * silhouette (beast, bird, bug, sprite, shell, spiny, biped, serpent) with cel
 * shading, a bold ink outline, a crest, a tail and body markings, for a lively
 * collector-monster look. Nothing here is traced or copied from any franchise. */

type Arch =
  | "beast"
  | "bird"
  | "bug"
  | "sprite"
  | "shell"
  | "spiny"
  | "biped"
  | "serpent";
type Crest =
  | "none"
  | "ears"
  | "bigears"
  | "horn"
  | "leaf"
  | "antenna"
  | "fin"
  | "tuft"
  | "plume"
  | "bud"
  | "spark";
type Tail = "none" | "stub" | "curl" | "bush" | "leaf" | "fan" | "spark" | "wisp";
type Pattern = "none" | "belly" | "back" | "spots" | "stripe";

interface Spec {
  arch: Arch;
  /** secondary colour for limbs, crest, belly */
  accent: string;
  crest: Crest;
  tail: Tail;
  pattern: Pattern;
}

/** bold outline colour per category */
const DARK: Record<Category, string> = {
  anchor: "#166534",
  drift: "#0e7490",
  hush: "#6b21a8",
  thrift: "#b45309",
  ward: "#be123c",
  snap: "#c2410c",
};

const SPEC: Record<CreatureId, Spec> = {
  // Anchor / Stone
  boulderpup: { arch: "beast", accent: "#a8a29e", crest: "ears", tail: "stub", pattern: "belly" },
  mossback: { arch: "shell", accent: "#4d7c2f", crest: "leaf", tail: "stub", pattern: "back" },
  slumberstone: { arch: "sprite", accent: "#a8a29e", crest: "tuft", tail: "wisp", pattern: "spots" },

  // Drift / Gust
  breezefinch: { arch: "bird", accent: "#e0f2fe", crest: "plume", tail: "fan", pattern: "belly" },
  tumbleweed: { arch: "spiny", accent: "#d6bd8a", crest: "tuft", tail: "curl", pattern: "none" },
  glidewing: { arch: "bird", accent: "#a5f3fc", crest: "tuft", tail: "fan", pattern: "back" },

  // Hush / Dream
  snoozemouse: { arch: "beast", accent: "#f9a8d4", crest: "bigears", tail: "curl", pattern: "belly" },
  fogkit: { arch: "sprite", accent: "#ede9fe", crest: "tuft", tail: "wisp", pattern: "belly" },
  dozderling: { arch: "biped", accent: "#ddd6fe", crest: "antenna", tail: "leaf", pattern: "none" },

  // Thrift / Sun
  nutsquirrel: { arch: "biped", accent: "#c2853f", crest: "tuft", tail: "bush", pattern: "belly" },
  acorncache: { arch: "shell", accent: "#b45309", crest: "bud", tail: "stub", pattern: "back" },
  sunbeetle: { arch: "bug", accent: "#7c2d12", crest: "horn", tail: "none", pattern: "none" },
  tallykit: { arch: "bug", accent: "#fdba74", crest: "antenna", tail: "none", pattern: "stripe" },

  // Ward / Shell
  pricklehog: { arch: "spiny", accent: "#fecdd3", crest: "none", tail: "stub", pattern: "none" },
  shellclam: { arch: "shell", accent: "#fbcfe8", crest: "fin", tail: "none", pattern: "back" },
  barknewt: { arch: "serpent", accent: "#4d7c2f", crest: "fin", tail: "none", pattern: "none" },
  thornpod: { arch: "spiny", accent: "#7f1d1d", crest: "bud", tail: "stub", pattern: "none" },
  quillhog: { arch: "spiny", accent: "#fda4af", crest: "none", tail: "stub", pattern: "back" },

  // Snap / Spark
  swiftwren: { arch: "bird", accent: "#fde68a", crest: "plume", tail: "fan", pattern: "belly" },
  digmole: { arch: "biped", accent: "#fbcfe8", crest: "none", tail: "stub", pattern: "none" },
  wildlark: { arch: "bird", accent: "#ffedd5", crest: "antenna", tail: "fan", pattern: "stripe" },
  bombkit: { arch: "sprite", accent: "#7c2d12", crest: "spark", tail: "spark", pattern: "none" },
};

interface Head {
  x: number;
  y: number;
  r: number;
}

const HEAD: Record<Arch, Head> = {
  beast: { x: 50, y: 36, r: 18 },
  bird: { x: 50, y: 31, r: 15 },
  bug: { x: 50, y: 44, r: 13 },
  sprite: { x: 50, y: 49, r: 26 },
  shell: { x: 33, y: 55, r: 12 },
  spiny: { x: 58, y: 58, r: 17 },
  biped: { x: 50, y: 31, r: 16 },
  serpent: { x: 24, y: 44, r: 13 },
};

const BACK: Record<Arch, { x: number; y: number }> = {
  beast: { x: 24, y: 58 },
  bird: { x: 36, y: 70 },
  bug: { x: 30, y: 66 },
  sprite: { x: 26, y: 66 },
  shell: { x: 74, y: 62 },
  spiny: { x: 32, y: 64 },
  biped: { x: 34, y: 68 },
  serpent: { x: 70, y: 58 },
};

/* ---- bodies -------------------------------------------------------- */

function beast(h: string, a: string, d: string, p: Pattern): ReactNode {
  return (
    <g>
      <g fill={a} stroke={d} strokeWidth="2.5">
        <ellipse cx="35" cy="80" rx="8" ry="10" />
        <ellipse cx="65" cy="80" rx="8" ry="10" />
        <ellipse cx="42" cy="84" rx="7" ry="8" />
        <ellipse cx="58" cy="84" rx="7" ry="8" />
      </g>
      <ellipse cx="30" cy="60" rx="14" ry="16" fill={h} stroke={d} strokeWidth="2.5" />
      <ellipse cx="50" cy="60" rx="28" ry="20" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="50" cy="68" rx="24" ry="13" fill="#00000016" />
      {p === "belly" && <ellipse cx="52" cy="64" rx="13" ry="14" fill="#ffffffbb" />}
      {p === "spots" && (
        <g fill="#00000020">
          <circle cx="38" cy="54" r="4" />
          <circle cx="60" cy="58" r="5" />
          <circle cx="50" cy="49" r="3" />
        </g>
      )}
      <ellipse cx="40" cy="48" rx="10" ry="7" fill="#ffffff35" />
      <ellipse cx="50" cy="36" rx="18" ry="17" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="43" cy="30" rx="7" ry="5" fill="#ffffff45" />
      <ellipse cx="50" cy="43" rx="9" ry="7" fill="#ffffffd0" />
      <ellipse cx="50" cy="41" rx="2.4" ry="1.8" fill={d} />
    </g>
  );
}

function bird(h: string, a: string, d: string, p: Pattern): ReactNode {
  return (
    <g>
      <g stroke={d} strokeWidth="3" strokeLinecap="round">
        <line x1="45" y1="82" x2="45" y2="90" />
        <line x1="57" y1="82" x2="57" y2="90" />
      </g>
      <g stroke={d} strokeWidth="2.5" strokeLinecap="round">
        <path d="M45 90 l-4 4 M45 90 l4 4 M57 90 l-4 4 M57 90 l4 4" />
      </g>
      {p === "back" && (
        <g fill={a} stroke={d} strokeWidth="2.5">
          <path d="M36 46 q-26 4 -24 30 q16 6 30 -10 z" />
          <path d="M64 46 q26 4 24 30 q-16 6 -30 -10 z" />
        </g>
      )}
      <path
        d="M50 28 C33 28 29 52 34 68 C40 82 60 82 66 68 C71 52 67 28 50 28 Z"
        fill={h}
        stroke={d}
        strokeWidth="3"
      />
      <ellipse cx="50" cy="60" rx="12" ry="17" fill={p === "belly" ? "#ffffffcc" : "#ffffff22"} />
      {p !== "back" && (
        <g fill={a} stroke={d} strokeWidth="2.5">
          <path d="M34 50 q-11 8 -7 24 q9 1 13 -9 z" />
          <path d="M66 50 q11 8 7 24 q-9 1 -13 -9 z" />
        </g>
      )}
      {p === "stripe" && (
        <g stroke={d} strokeWidth="2" opacity="0.4" fill="none">
          <path d="M41 72 h18 M43 66 h14" />
        </g>
      )}
      <circle cx="50" cy="31" r="15" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="44" cy="26" rx="6" ry="4" fill="#ffffff45" />
      <path
        d="M50 33 l-7 6 l7 4 l7 -4 z"
        fill="#f6b73c"
        stroke={d}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
  );
}

function bug(h: string, _a: string, d: string, p: Pattern): ReactNode {
  return (
    <g>
      <g stroke={d} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M40 56 l-16 -6 M40 64 l-18 2 M40 72 l-15 10" />
        <path d="M60 56 l16 -6 M60 64 l18 2 M60 72 l15 10" />
      </g>
      <ellipse cx="50" cy="64" rx="22" ry="19" fill={h} stroke={d} strokeWidth="3" />
      <path d="M50 45 a22 19 0 0 1 0 38 z" fill="#0000001c" />
      <line x1="50" y1="45" x2="50" y2="83" stroke={d} strokeWidth="2" />
      {p === "stripe" && (
        <g stroke={d} strokeWidth="2.4" opacity="0.5" fill="none">
          <path d="M31 58 h38 M30 66 h40 M33 74 h34" />
        </g>
      )}
      <ellipse cx="40" cy="56" rx="4" ry="6" fill="#ffffff55" />
      <ellipse cx="50" cy="44" rx="13" ry="11" fill={h} stroke={d} strokeWidth="3" />
    </g>
  );
}

function sprite(h: string, _a: string, d: string, p: Pattern): ReactNode {
  return (
    <g>
      <path
        d="M22 48 a28 28 0 0 1 56 0 c0 20 -6 30 -11 37 q-5 -7 -9 0 q-4 6 -8 0 q-4 6 -8 0 q-4 6 -9 0 c-5 -7 -11 -17 -11 -37 z"
        fill={h}
        stroke={d}
        strokeWidth="3"
      />
      <ellipse cx="40" cy="38" rx="13" ry="10" fill="#ffffff40" />
      <ellipse cx="20" cy="52" rx="6" ry="9" fill={h} stroke={d} strokeWidth="2.5" />
      <ellipse cx="80" cy="52" rx="6" ry="9" fill={h} stroke={d} strokeWidth="2.5" />
      {p === "belly" && <ellipse cx="50" cy="56" rx="15" ry="16" fill="#ffffffb0" />}
      {p === "spots" && (
        <g fill="#00000018">
          <circle cx="34" cy="58" r="4" />
          <circle cx="66" cy="60" r="5" />
        </g>
      )}
    </g>
  );
}

function shell(h: string, a: string, d: string, p: Pattern): ReactNode {
  return (
    <g>
      <g fill={h} stroke={d} strokeWidth="2.5">
        <ellipse cx="42" cy="80" rx="8" ry="7" />
        <ellipse cx="66" cy="80" rx="8" ry="7" />
      </g>
      <circle cx="33" cy="55" r="12" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="28" cy="50" rx="5" ry="4" fill="#ffffff45" />
      <path d="M26 66 a31 27 0 0 1 62 0 z" fill={a} stroke={d} strokeWidth="3" />
      <path d="M26 66 a31 27 0 0 1 62 0" fill="#0000001c" />
      <g stroke={d} strokeWidth="1.6" fill="none" opacity="0.45">
        <path d="M57 40 v26 M43 44 v22 M71 46 v20 M31 56 h52" />
      </g>
      {p === "back" && (
        <g fill="#ffffff35">
          <circle cx="50" cy="52" r="4" />
          <circle cx="64" cy="56" r="3" />
          <circle cx="40" cy="58" r="3" />
        </g>
      )}
    </g>
  );
}

function spikeArc(cx: number, cy: number, rx: number, ry: number, len: number) {
  const N = 9;
  const seg: string[] = [];
  for (let i = 0; i <= N; i++) {
    const ang = Math.PI * (1 - i / N);
    const bx = cx + Math.cos(ang) * rx;
    const by = cy - Math.sin(ang) * ry;
    if (i === 0) {
      seg.push(`M${bx.toFixed(1)} ${by.toFixed(1)}`);
      continue;
    }
    const am = Math.PI * (1 - (i - 0.5) / N);
    const tx = cx + Math.cos(am) * (rx + len);
    const ty = cy - Math.sin(am) * (ry + len);
    seg.push(`L${tx.toFixed(1)} ${ty.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`);
  }
  seg.push(`L${(cx + rx).toFixed(1)} ${(cy + ry * 0.5).toFixed(1)}`);
  seg.push(`L${(cx - rx).toFixed(1)} ${(cy + ry * 0.5).toFixed(1)} Z`);
  return seg.join(" ");
}

function spiny(h: string, a: string, d: string, p: Pattern): ReactNode {
  const len = p === "back" ? 15 : 9;
  return (
    <g>
      <g fill={a} stroke={d} strokeWidth="2.5">
        <ellipse cx="42" cy="82" rx="7" ry="7" />
        <ellipse cx="62" cy="82" rx="7" ry="7" />
      </g>
      <path
        d={spikeArc(50, 64, 30, 25, len)}
        fill={a}
        stroke={d}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse cx="56" cy="64" rx="21" ry="19" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="62" cy="70" rx="12" ry="11" fill="#ffffffa8" />
      <ellipse cx="49" cy="55" rx="7" ry="5" fill="#ffffff40" />
      <ellipse cx="75" cy="64" rx="3" ry="2.4" fill={d} />
    </g>
  );
}

function biped(h: string, a: string, d: string, p: Pattern): ReactNode {
  return (
    <g>
      <g fill={a} stroke={d} strokeWidth="2.5">
        <ellipse cx="42" cy="87" rx="8" ry="6" />
        <ellipse cx="58" cy="87" rx="8" ry="6" />
      </g>
      <path
        d="M50 40 c-17 0 -21 20 -18 32 c2 11 11 15 18 15 c7 0 16 -4 18 -15 c3 -12 -1 -32 -18 -32 z"
        fill={h}
        stroke={d}
        strokeWidth="3"
      />
      <ellipse cx="50" cy="70" rx="12" ry="15" fill="#ffffffc0" />
      {p === "belly" && <ellipse cx="50" cy="70" rx="12" ry="15" fill={a} opacity="0.5" />}
      <ellipse cx="29" cy="60" rx="6" ry="11" fill={h} stroke={d} strokeWidth="2.5" />
      <ellipse cx="71" cy="60" rx="6" ry="11" fill={h} stroke={d} strokeWidth="2.5" />
      <circle cx="50" cy="31" r="16" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="43" cy="25" rx="6" ry="4" fill="#ffffff45" />
    </g>
  );
}

function serpent(h: string, a: string, d: string, _p: Pattern): ReactNode {
  return (
    <g>
      {/* curling tail */}
      <path
        d="M70 58 q16 2 18 -12 q1 -9 -7 -9 q-6 0 -5 7"
        fill="none"
        stroke={h}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M70 58 q16 2 18 -12 q1 -9 -7 -9 q-6 0 -5 7"
        fill="none"
        stroke={d}
        strokeWidth="11"
        strokeLinecap="round"
        opacity="0.28"
      />
      {/* splayed legs */}
      <g fill={a} stroke={d} strokeWidth="2.5">
        <ellipse cx="30" cy="66" rx="6" ry="8" transform="rotate(20 30 66)" />
        <ellipse cx="58" cy="66" rx="6" ry="8" transform="rotate(-20 58 66)" />
        <ellipse cx="38" cy="70" rx="5" ry="6" />
        <ellipse cx="52" cy="70" rx="5" ry="6" />
      </g>
      {/* long low body */}
      <ellipse cx="44" cy="54" rx="26" ry="14" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="44" cy="59" rx="21" ry="8" fill="#00000016" />
      <path
        d="M28 46 q16 -10 32 0"
        fill="none"
        stroke="#ffffff55"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* back ridge */}
      <g fill={d} opacity="0.55">
        <path d="M34 42 l-3 -6 l6 1 z" />
        <path d="M44 40 l-3 -7 l6 1 z" />
        <path d="M54 42 l-3 -6 l6 1 z" />
      </g>
      {/* head */}
      <circle cx="24" cy="44" r="13" fill={h} stroke={d} strokeWidth="3" />
      <ellipse cx="19" cy="48" rx="7" ry="5" fill="#ffffffb0" />
      <ellipse cx="20" cy="39" rx="4" ry="3" fill="#ffffff45" />
    </g>
  );
}

const BODY: Record<Arch, (h: string, a: string, d: string, p: Pattern) => ReactNode> = {
  beast,
  bird,
  bug,
  sprite,
  shell,
  spiny,
  biped,
  serpent,
};

/* ---- crest + tail + face ----------------------------------------- */

function crest(k: Crest, hd: Head, a: string, d: string, h: string): ReactNode {
  const { x, r } = hd;
  const top = hd.y - r;
  switch (k) {
    case "ears":
      return (
        <g fill={h} stroke={d} strokeWidth="2.5" strokeLinejoin="round">
          <path d={`M${x - r * 0.7} ${top + 7} l-6 -15 l13 4 z`} />
          <path d={`M${x + r * 0.7} ${top + 7} l6 -15 l-13 4 z`} />
        </g>
      );
    case "bigears":
      return (
        <g stroke={d} strokeWidth="2.5">
          <ellipse cx={x - r * 0.8} cy={top - 3} rx="7" ry="13" fill={h} />
          <ellipse cx={x + r * 0.8} cy={top - 3} rx="7" ry="13" fill={h} />
          <ellipse cx={x - r * 0.8} cy={top - 3} rx="3" ry="7" fill={a} stroke="none" />
          <ellipse cx={x + r * 0.8} cy={top - 3} rx="3" ry="7" fill={a} stroke="none" />
        </g>
      );
    case "horn":
      return (
        <path
          d={`M${x} ${top + 5} l-6 -17 l12 0 z`}
          fill={a}
          stroke={d}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );
    case "leaf":
      return (
        <g fill={a} stroke={d} strokeWidth="1.5">
          <path d={`M${x} ${top + 5} q-3 -16 -14 -18 q1 14 14 18 z`} />
          <path d={`M${x} ${top + 5} q3 -16 14 -18 q-1 14 -14 18 z`} />
        </g>
      );
    case "antenna":
      return (
        <g stroke={d} strokeWidth="2.5" strokeLinecap="round">
          <path d={`M${x} ${top + 4} q-4 -10 -10 -14`} fill="none" />
          <circle cx={x - 10} cy={top - 12} r="4" fill={a} strokeWidth="1.5" />
        </g>
      );
    case "fin":
      return (
        <path
          d={`M${x - 10} ${top + 7} q10 -18 20 0 q-10 -4 -20 0 z`}
          fill={a}
          stroke={d}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );
    case "tuft":
      return (
        <path
          d={`M${x - 9} ${top + 7} q3 -16 9 -8 q6 -8 9 8 q-9 -6 -18 0 z`}
          fill={a}
          stroke={d}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case "plume":
      return (
        <g fill={a} stroke={d} strokeWidth="1.5" strokeLinejoin="round">
          <path d={`M${x} ${top + 5} l-4 -17 l4 4 l4 -4 z`} />
          <path d={`M${x - 7} ${top + 7} l-3 -13 l4 3 z`} />
          <path d={`M${x + 7} ${top + 7} l3 -13 l-4 3 z`} />
        </g>
      );
    case "bud":
      return (
        <g stroke={d} strokeWidth="2" strokeLinecap="round">
          <line x1={x} y1={top + 5} x2={x} y2={top - 8} />
          <circle cx={x} cy={top - 11} r="5" fill={a} />
        </g>
      );
    case "spark":
      return (
        <path
          d={`M${x - 2} ${top + 7} l6 -15 l-4 6 l6 0 l-9 15 l3 -12 z`}
          fill="#fde047"
          stroke={d}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

function tail(k: Tail, b: { x: number; y: number }, a: string, d: string, h: string): ReactNode {
  switch (k) {
    case "stub":
      return <ellipse cx={b.x} cy={b.y} rx="7" ry="7" fill={h} stroke={d} strokeWidth="2.5" />;
    case "curl":
      return (
        <path
          d={`M${b.x} ${b.y} q-14 -2 -14 -14 q0 -8 7 -8 q6 0 5 7`}
          fill="none"
          stroke={d}
          strokeWidth="6"
          strokeLinecap="round"
        />
      );
    case "bush":
      return (
        <path
          d={`M${b.x + 4} ${b.y + 6} q-22 0 -22 -20 q0 -16 12 -18 q-6 12 2 20 q-8 10 8 16 z`}
          fill={a}
          stroke={d}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      );
    case "leaf":
      return (
        <path
          d={`M${b.x} ${b.y} q-14 -4 -16 -18 q12 2 16 18 z`}
          fill={a}
          stroke={d}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case "fan":
      return (
        <g fill={a} stroke={d} strokeWidth="2" strokeLinejoin="round">
          <path d={`M${b.x + 6} ${b.y - 4} l-16 -4 l4 10 z`} />
          <path d={`M${b.x + 6} ${b.y} l-18 2 l6 10 z`} />
          <path d={`M${b.x + 6} ${b.y + 4} l-15 10 l8 6 z`} />
        </g>
      );
    case "spark":
      return (
        <path
          d={`M${b.x} ${b.y - 6} l-10 12 l6 0 l-6 10 l14 -14 l-6 0 z`}
          fill="#fde047"
          stroke={d}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      );
    case "wisp":
      return (
        <g fill={h} opacity="0.8">
          <circle cx={b.x} cy={b.y} r="5" />
          <circle cx={b.x - 7} cy={b.y + 4} r="3.5" />
          <circle cx={b.x + 3} cy={b.y + 8} r="3" />
        </g>
      );
    default:
      return null;
  }
}

function Face({ hd, d, mouth }: { hd: Head; d: string; mouth: boolean }) {
  const { x, y, r } = hd;
  const ex = r * 0.4;
  const ey = y - r * 0.02;
  const er = r * 0.24;
  return (
    <g>
      <ellipse cx={x - ex} cy={ey} rx={er} ry={er * 1.2} fill="#241b2e" />
      <ellipse cx={x + ex} cy={ey} rx={er} ry={er * 1.2} fill="#241b2e" />
      <circle cx={x - ex + er * 0.4} cy={ey - er * 0.5} r={er * 0.42} fill="#fff" />
      <circle cx={x + ex + er * 0.4} cy={ey - er * 0.5} r={er * 0.42} fill="#fff" />
      {mouth && (
        <path
          d={`M${x - r * 0.2} ${y + r * 0.4} q${r * 0.2} ${r * 0.24} ${r * 0.4} 0`}
          fill="none"
          stroke={d}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}
      <circle cx={x - r * 0.72} cy={y + r * 0.3} r={r * 0.13} fill="#ff9db1" opacity="0.6" />
      <circle cx={x + r * 0.72} cy={y + r * 0.3} r={r * 0.13} fill="#ff9db1" opacity="0.6" />
    </g>
  );
}

export function Critter({ id, size = 44 }: { id: CreatureId; size?: number }) {
  const spec = SPEC[id];
  const cat = ROSTER[id].category;
  const hue = CATEGORIES[cat].hue;
  const d = DARK[cat];
  const hd = HEAD[spec.arch];
  const mouth = spec.arch !== "bird" && spec.arch !== "bug";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={ROSTER[id].name}
    >
      <ellipse cx="50" cy="93" rx="26" ry="4.5" fill="#00000018" />
      {tail(spec.tail, BACK[spec.arch], spec.accent, d, hue)}
      {BODY[spec.arch](hue, spec.accent, d, spec.pattern)}
      {crest(spec.crest, hd, spec.accent, d, hue)}
      <Face hd={hd} d={d} mouth={mouth} />
    </svg>
  );
}
