import { useId, type ReactNode } from "react";
import { CATEGORIES, ROSTER, CreatureId } from "../engine";

/* One flat, thick-outline, cel-shaded style across the whole roster. Every
 * creature is built from simple shapes, filled, given the same clipped shade
 * and highlight, then a single heavy ink outline. Chibi proportions: big
 * head, small soft body, little stubby limbs. All art is original. */

const INK = "#2b2233";
const OW = 3.4;

function rgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}
function mix(a: number[], b: number[], t: number) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
}
interface Tone {
  hue: string;
  shade: string;
  light: string;
}
function toneOf(hex: string): Tone {
  const c = rgb(hex);
  return {
    hue: hex,
    shade: mix(c, [34, 16, 46], 0.4),
    light: mix(c, [255, 255, 255], 0.52),
  };
}

/* ---- shapes -------------------------------------------------------- */

type Shape = { c: [number, number, number, number] } | { p: string };

function drawShape(s: Shape, extra: Record<string, unknown>, key: number) {
  return "c" in s ? (
    <ellipse key={key} cx={s.c[0]} cy={s.c[1]} rx={s.c[2]} ry={s.c[3]} {...extra} />
  ) : (
    <path key={key} d={s.p} {...extra} />
  );
}

/** fill + one clipped shade + one clipped highlight + one heavy outline */
function Body({ cid, parts, tone }: { cid: string; parts: Shape[]; tone: Tone }) {
  return (
    <g>
      <defs>
        <clipPath id={cid}>{parts.map((s, i) => drawShape(s, {}, i))}</clipPath>
      </defs>
      {parts.map((s, i) => drawShape(s, { fill: tone.hue }, i))}
      <g clipPath={`url(#${cid})`}>
        <ellipse cx="54" cy="96" rx="70" ry="52" fill={tone.shade} opacity="0.5" />
        <ellipse cx="38" cy="24" rx="40" ry="27" fill={tone.light} opacity="0.55" />
      </g>
      {parts.map((s, i) =>
        drawShape(
          s,
          {
            fill: "none",
            stroke: INK,
            strokeWidth: OW,
            strokeLinejoin: "round",
            strokeLinecap: "round",
          },
          i,
        ),
      )}
    </g>
  );
}

function spikePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  spike: number,
  n: number,
) {
  let d = `M${cx - rx} ${cy}`;
  for (let i = 1; i <= n; i++) {
    const a = Math.PI * (1 - i / n);
    const bx = cx + Math.cos(a) * rx;
    const by = cy - Math.sin(a) * ry;
    const am = Math.PI * (1 - (i - 0.5) / n);
    const tx = cx + Math.cos(am) * (rx + spike);
    const ty = cy - Math.sin(am) * (ry + spike);
    d += ` L${tx.toFixed(1)} ${ty.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  d += ` Q${cx + rx * 0.9} ${cy + ry * 1.5} ${cx} ${cy + ry * 1.6}`;
  d += ` Q${cx - rx * 0.9} ${cy + ry * 1.5} ${cx - rx} ${cy} Z`;
  return d;
}

/* ---- archetypes: silhouette + where the head/feature sit ---------- */

interface Head {
  x: number;
  y: number;
  r: number;
}
interface Arch {
  back: Shape[];
  main: Shape[];
  head: Head;
}

const ARCH: Record<string, () => Arch> = {
  puff: () => ({
    back: [],
    main: [
      { c: [33, 92, 9, 6] },
      { c: [71, 92, 9, 6] },
      {
        p: "M52 12 C24 12 12 38 12 60 C12 84 30 96 52 96 C74 96 92 84 92 60 C92 38 80 12 52 12 Z",
      },
    ],
    head: { x: 52, y: 50, r: 32 },
  }),
  pup: () => ({
    back: [{ p: "M22 60 q-15 -3 -13 -20 q11 1 15 20 z" }],
    main: [
      { c: [52, 66, 27, 20] },
      { c: [30, 66, 12, 13] },
      { c: [34, 87, 9, 6] },
      { c: [70, 87, 9, 6] },
      { c: [52, 33, 22, 21] },
    ],
    head: { x: 52, y: 33, r: 21 },
  }),
  kit: () => ({
    back: [],
    main: [
      { c: [52, 68, 22, 19] },
      { c: [31, 70, 8, 11] },
      { c: [73, 70, 8, 11] },
      { c: [41, 94, 9, 6] },
      { c: [63, 94, 9, 6] },
      { c: [52, 37, 23, 22] },
    ],
    head: { x: 52, y: 37, r: 23 },
  }),
  bird: () => ({
    back: [
      { p: "M34 46 q-20 2 -22 24 q16 6 26 -8 z" },
      { p: "M70 46 q20 2 22 24 q-16 6 -26 -8 z" },
      { p: "M52 74 q-10 14 0 22 q10 -8 0 -22 z" },
    ],
    main: [
      { c: [44, 93, 7, 5] },
      { c: [61, 93, 7, 5] },
      {
        p: "M52 24 C34 24 27 46 31 66 C35 84 69 84 73 66 C77 46 70 24 52 24 Z",
      },
      { c: [52, 28, 18, 17] },
    ],
    head: { x: 52, y: 28, r: 17 },
  }),
  bug: () => ({
    back: [],
    main: [
      { c: [27, 58, 6, 5] },
      { c: [25, 74, 6, 5] },
      { c: [77, 58, 6, 5] },
      { c: [79, 74, 6, 5] },
      { c: [52, 70, 25, 21] },
      { c: [52, 42, 16, 14] },
    ],
    head: { x: 52, y: 42, r: 15 },
  }),
  shell: () => ({
    back: [],
    main: [
      { c: [32, 88, 10, 7] },
      { c: [72, 88, 10, 7] },
      { c: [52, 72, 32, 18] },
      { c: [52, 46, 15, 15] },
    ],
    head: { x: 52, y: 44, r: 15 },
  }),
  spike: () => ({
    back: [],
    main: [
      { c: [38, 92, 9, 6] },
      { c: [67, 92, 9, 6] },
      { p: spikePath(52, 54, 30, 22, 13, 8) },
    ],
    head: { x: 52, y: 58, r: 20 },
  }),
  newt: () => ({
    back: [{ p: "M74 58 q20 0 22 -15 q4 13 -3 23 q-12 8 -20 3 z" }],
    main: [
      { c: [34, 74, 7, 8] },
      { c: [70, 74, 7, 8] },
      { c: [52, 60, 30, 15] },
      { c: [38, 42, 15, 14] },
    ],
    head: { x: 38, y: 42, r: 15 },
  }),
};

/* ---- head features ----------------------------------------------- */

type Feat =
  | "none"
  | "ears"
  | "roundears"
  | "leaf"
  | "tuft"
  | "plume"
  | "antler"
  | "horn"
  | "fin"
  | "bud"
  | "spark";

function feature(f: Feat, h: Head, tone: Tone): ReactNode {
  const { x, r } = h;
  const top = h.y - r;
  const P = (d: string, fill = tone.hue) => (
    <path
      d={d}
      fill={fill}
      stroke={INK}
      strokeWidth={OW}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
  switch (f) {
    case "ears":
      return (
        <g>
          {P(`M${x - r * 0.62} ${top + 10} L${x - r * 0.5} ${top - 14} L${x - r * 0.08} ${top + 4} Z`)}
          {P(`M${x + r * 0.62} ${top + 10} L${x + r * 0.5} ${top - 14} L${x + r * 0.08} ${top + 4} Z`)}
        </g>
      );
    case "roundears":
      return (
        <g>
          <circle cx={x - r * 0.78} cy={top + 4} r="11" fill={tone.hue} stroke={INK} strokeWidth={OW} />
          <circle cx={x + r * 0.78} cy={top + 4} r="11" fill={tone.hue} stroke={INK} strokeWidth={OW} />
          <circle cx={x - r * 0.78} cy={top + 5} r="5.5" fill={tone.light} />
          <circle cx={x + r * 0.78} cy={top + 5} r="5.5" fill={tone.light} />
        </g>
      );
    case "leaf":
      return (
        <g>
          {P(`M${x} ${top + 8} C${x - 4} ${top - 6} ${x - 16} ${top - 10} ${x - 18} ${top - 22} C${x - 6} ${top - 20} ${x + 2} ${top - 6} ${x} ${top + 8} Z`)}
        </g>
      );
    case "tuft":
      return P(
        `M${x - 12} ${top + 8} C${x - 12} ${top - 10} ${x - 2} ${top - 8} ${x} ${top + 2} C${x + 2} ${top - 12} ${x + 13} ${top - 8} ${x + 12} ${top + 8} Z`,
      );
    case "plume":
      return (
        <g>
          {P(`M${x} ${top + 8} L${x - 4} ${top - 16} L${x} ${top - 10} L${x + 4} ${top - 16} Z`)}
          {P(`M${x - 8} ${top + 8} L${x - 12} ${top - 10} L${x - 5} ${top - 6} Z`)}
          {P(`M${x + 8} ${top + 8} L${x + 12} ${top - 10} L${x + 5} ${top - 6} Z`)}
        </g>
      );
    case "antler":
      return (
        <g stroke={INK} strokeWidth={OW} strokeLinecap="round" fill="none">
          <path d={`M${x - 5} ${top + 6} q-4 -12 -10 -16 m0 8 l-7 -3`} />
          <path d={`M${x + 5} ${top + 6} q4 -12 10 -16 m0 8 l7 -3`} />
        </g>
      );
    case "horn":
      return P(`M${x} ${top + 6} L${x - 7} ${top - 16} L${x + 7} ${top - 16} Z`, tone.light);
    case "fin":
      return P(
        `M${x - 12} ${top + 10} C${x - 8} ${top - 8} ${x + 8} ${top - 8} ${x + 12} ${top + 10} C${x + 4} ${top + 4} ${x - 4} ${top + 4} ${x - 12} ${top + 10} Z`,
      );
    case "bud":
      return (
        <g>
          <path d={`M${x} ${top + 8} V${top - 8}`} stroke={INK} strokeWidth={OW} strokeLinecap="round" />
          <circle cx={x} cy={top - 12} r="6" fill={tone.light} stroke={INK} strokeWidth={OW} />
        </g>
      );
    case "spark":
      return (
        <path
          d={`M${x - 3} ${top + 8} L${x + 5} ${top - 16} L${x} ${top - 6} L${x + 8} ${top - 6} L${x - 4} ${top + 16} L${x + 1} ${top - 2} L${x - 6} ${top - 2} Z`}
          fill="#ffd23f"
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

/* ---- face -------------------------------------------------------- */

type Eye = "open" | "sleepy" | "happy" | "dot";
type Mouth = "smile" | "open" | "cat" | "flat" | "beak";

function eyes(kind: Eye, h: Head): ReactNode {
  const ex = h.r * 0.44;
  const ey = h.y - h.r * 0.04;
  const s = Math.max(3, h.r * 0.3);
  const one = (cx: number) => {
    if (kind === "dot") return <circle cx={cx} cy={ey} r={s * 0.5} fill={INK} />;
    if (kind === "sleepy")
      return (
        <path
          d={`M${cx - s} ${ey - 1} q${s} ${s * 1.1} ${s * 2} 0`}
          fill="none"
          stroke={INK}
          strokeWidth={OW}
          strokeLinecap="round"
        />
      );
    if (kind === "happy")
      return (
        <path
          d={`M${cx - s} ${ey + 2} q${s} ${-s * 1.4} ${s * 2} 0`}
          fill="none"
          stroke={INK}
          strokeWidth={OW}
          strokeLinecap="round"
        />
      );
    return (
      <g>
        <ellipse cx={cx} cy={ey} rx={s * 0.92} ry={s * 1.12} fill={INK} />
        <circle cx={cx - s * 0.32} cy={ey - s * 0.52} r={s * 0.42} fill="#fff" />
        <circle cx={cx + s * 0.28} cy={ey + s * 0.42} r={s * 0.2} fill="#fff" opacity="0.9" />
      </g>
    );
  };
  return (
    <g>
      <g transform={`translate(${h.x - ex} 0)`}>{one(0)}</g>
      <g transform={`translate(${h.x + ex} 0)`}>{one(0)}</g>
    </g>
  );
}

function mouth(kind: Mouth, h: Head): ReactNode {
  const my = h.y + h.r * 0.42;
  const w = h.r * 0.24;
  if (kind === "beak")
    return (
      <path
        d={`M${h.x - w * 1.6} ${my - 3} L${h.x} ${my + 6} L${h.x + w * 1.6} ${my - 3} Z`}
        fill="#f4b73e"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    );
  if (kind === "open")
    return (
      <path
        d={`M${h.x - w} ${my - 1} Q${h.x} ${my + w * 2} ${h.x + w} ${my - 1} Q${h.x} ${my + 1} ${h.x - w} ${my - 1} Z`}
        fill={INK}
      />
    );
  if (kind === "cat")
    return (
      <path
        d={`M${h.x - w * 1.5} ${my - 2} Q${h.x - w * 0.7} ${my + 4} ${h.x} ${my - 1} Q${h.x + w * 0.7} ${my + 4} ${h.x + w * 1.5} ${my - 2}`}
        fill="none"
        stroke={INK}
        strokeWidth={OW}
        strokeLinecap="round"
      />
    );
  if (kind === "flat")
    return (
      <path
        d={`M${h.x - w} ${my} H${h.x + w}`}
        stroke={INK}
        strokeWidth={OW}
        strokeLinecap="round"
      />
    );
  return (
    <path
      d={`M${h.x - w} ${my - 1} q${w} ${w * 1.5} ${w * 2} 0`}
      fill="none"
      stroke={INK}
      strokeWidth={OW}
      strokeLinecap="round"
    />
  );
}

/* ---- roster ----------------------------------------------------- */

interface Spec {
  arch: string;
  accent: string;
  feat: Feat;
  eye: Eye;
  mouth: Mouth;
  belly: boolean;
}

const SPEC: Record<CreatureId, Spec> = {
  boulderpup: { arch: "pup", accent: "#a8a29e", feat: "ears", eye: "open", mouth: "smile", belly: true },
  mossback: { arch: "shell", accent: "#7c9a3e", feat: "leaf", eye: "sleepy", mouth: "smile", belly: false },
  slumberstone: { arch: "puff", accent: "#b7b1ab", feat: "tuft", eye: "sleepy", mouth: "smile", belly: false },

  breezefinch: { arch: "bird", accent: "#dff1ff", feat: "plume", eye: "open", mouth: "beak", belly: true },
  tumbleweed: { arch: "puff", accent: "#d9c08c", feat: "tuft", eye: "open", mouth: "smile", belly: false },
  glidewing: { arch: "bird", accent: "#c8f4fb", feat: "none", eye: "open", mouth: "beak", belly: true },

  snoozemouse: { arch: "pup", accent: "#f6b6d3", feat: "roundears", eye: "sleepy", mouth: "smile", belly: true },
  fogkit: { arch: "puff", accent: "#e6dcff", feat: "ears", eye: "sleepy", mouth: "smile", belly: false },
  dozderling: { arch: "kit", accent: "#d8ccff", feat: "antler", eye: "sleepy", mouth: "smile", belly: false },

  nutsquirrel: { arch: "kit", accent: "#caa25f", feat: "tuft", eye: "open", mouth: "open", belly: true },
  acorncache: { arch: "kit", accent: "#b9803f", feat: "leaf", eye: "happy", mouth: "smile", belly: true },
  sunbeetle: { arch: "bug", accent: "#8a4a20", feat: "horn", eye: "open", mouth: "smile", belly: false },
  tallykit: { arch: "kit", accent: "#f7c88a", feat: "ears", eye: "open", mouth: "smile", belly: true },

  pricklehog: { arch: "spike", accent: "#ffd9c9", feat: "none", eye: "happy", mouth: "smile", belly: false },
  shellclam: { arch: "shell", accent: "#ffc9e6", feat: "none", eye: "open", mouth: "smile", belly: false },
  barknewt: { arch: "newt", accent: "#7c9a3e", feat: "fin", eye: "open", mouth: "smile", belly: false },
  thornpod: { arch: "spike", accent: "#8f2f3a", feat: "bud", eye: "open", mouth: "flat", belly: false },
  quillhog: { arch: "spike", accent: "#ff9db1", feat: "none", eye: "open", mouth: "open", belly: false },

  swiftwren: { arch: "bird", accent: "#ffe6a8", feat: "plume", eye: "open", mouth: "beak", belly: true },
  digmole: { arch: "kit", accent: "#f6c9dc", feat: "none", eye: "dot", mouth: "smile", belly: false },
  wildlark: { arch: "bird", accent: "#ffe0c2", feat: "plume", eye: "happy", mouth: "beak", belly: false },
  bombkit: { arch: "puff", accent: "#7c3a20", feat: "spark", eye: "open", mouth: "cat", belly: false },
};

export function Critter({ id, size = 44 }: { id: CreatureId; size?: number }) {
  const uid = useId();
  const spec = SPEC[id];
  const cat = ROSTER[id].category;
  const tone = toneOf(CATEGORIES[cat].hue);
  const accent = toneOf(spec.accent);
  const a = ARCH[spec.arch]();
  const h = a.head;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 104 108"
      role="img"
      aria-label={ROSTER[id].name}
    >
      <ellipse cx="52" cy="101" rx="30" ry="5" fill="#00000018" />

      {a.back.length > 0 && (
        <Body cid={`${uid}-k`} parts={a.back} tone={accent} />
      )}
      {feature(spec.feat, h, accent)}
      <Body cid={`${uid}-m`} parts={a.main} tone={tone} />

      {spec.belly && (
        <ellipse
          cx={h.x}
          cy={h.y + h.r * 0.95}
          rx={h.r * 0.62}
          ry={h.r * 0.72}
          fill={tone.light}
          opacity="0.85"
        />
      )}

      {eyes(spec.eye, h)}
      {mouth(spec.mouth, h)}

      <circle cx={h.x - h.r * 0.78} cy={h.y + h.r * 0.34} r={h.r * 0.16} fill="#ff9db8" opacity="0.55" />
      <circle cx={h.x + h.r * 0.78} cy={h.y + h.r * 0.34} r={h.r * 0.16} fill="#ff9db8" opacity="0.55" />
    </svg>
  );
}
