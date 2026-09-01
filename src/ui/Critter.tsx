import { useId, type ReactNode } from "react";
import { CATEGORIES, ROSTER, CreatureId, creaturesByCategory } from "../engine";

/* A stylised vector take on the collector-monster look: 3/4-angled bodies with
 * real limbs and features, anime almond eyes with irises and lids, hard cel
 * shading with a rim light, and a light two-weight ink line (dark-tinted, not
 * pure black). All art is original. Canvas is 120x128 with headroom up top so
 * crests and ears never clip. */

const OW = 2.3; // outer silhouette line
const IW = 1.3; // interior detail line

function rgb(h: string): [number, number, number] {
  const m = h.match(/rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (m) return [+m[1], +m[2], +m[3]].map(Math.round) as [number, number, number];
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => clamp(v + (b[i] - v) * t)).join(",")})`;

interface Tone {
  hue: string;
  shade: string;
  deep: string;
  light: string;
  line: string;
}
// nudge each critter's shade so same-type siblings don't read identical
const SIB_SHIFT: Array<[number[], number]> = [
  [[255, 255, 255], 0],
  [[255, 255, 255], 0.16],
  [[26, 18, 34], 0.18],
  [[26, 18, 34], 0.32],
  [[255, 255, 255], 0.12],
];
function siblingHue(hex: string, idx: number): string {
  const [target, amt] = SIB_SHIFT[idx % SIB_SHIFT.length];
  return amt === 0 ? hex : mix(rgb(hex), target, amt);
}

function toneOf(hex: string): Tone {
  const c = rgb(hex);
  return {
    hue: hex,
    shade: mix(c, [40, 22, 60], 0.3),
    deep: mix(c, [30, 16, 44], 0.5),
    light: mix(c, [255, 255, 255], 0.6),
    line: mix(c, [24, 16, 28], 0.76),
  };
}

/* ---- shapes ------------------------------------------------------- */

type Shape = {
  c?: [number, number, number, number];
  p?: string;
  f?: string; // fill override (marks: belly, stripes...)
  in?: boolean; // interior line weight, and kept out of the silhouette clip
};

function el(s: Shape, extra: Record<string, unknown>, key: number) {
  return s.c ? (
    <ellipse key={key} cx={s.c[0]} cy={s.c[1]} rx={s.c[2]} ry={s.c[3]} {...extra} />
  ) : (
    <path key={key} d={s.p} {...extra} />
  );
}

/** fill everything, lay a hard cel shadow + rim light clipped to the body,
 *  then stroke with a light two-weight line */
function Cel({ cid, shapes, t }: { cid: string; shapes: Shape[]; t: Tone }) {
  const sil = shapes.filter((s) => !s.in && !s.f);
  return (
    <g>
      <defs>
        <clipPath id={cid}>{sil.map((s, i) => el(s, {}, i))}</clipPath>
      </defs>
      {shapes.map((s, i) =>
        s.in ? null : el(s, { fill: s.f ?? t.hue }, i),
      )}
      <g clipPath={`url(#${cid})`}>
        {/* cel shadow: a soft diagonal on the lower-right / underside */}
        <path d="M124 136 L124 44 L66 136 Z" fill={t.shade} opacity="0.42" />
        <ellipse cx="94" cy="112" rx="34" ry="30" fill={t.deep} opacity="0.28" />
        {/* rim light along the upper-left edge */}
        <path
          d="M6 48 Q 32 8 74 12 Q 42 20 22 54 Z"
          fill={t.light}
          opacity="0.6"
        />
      </g>
      {shapes.map((s, i) =>
        s.f
          ? null
          : el(
              s,
              {
                fill: "none",
                stroke: t.line,
                strokeWidth: s.in ? IW : OW,
                strokeLinejoin: "round",
                strokeLinecap: "round",
              },
              i,
            ),
      )}
    </g>
  );
}

/* ---- anime eyes ------------------------------------------------- */

type EyeStyle =
  | "open"
  | "sleepy"
  | "happy"
  | "dot"
  | "sharp"
  | "wide"
  | "wink"
  | "derp";

// per-style: size multiplier, how open (1 = full, <1 = drooping lid), and a
// small vertical offset for the pupil to point the gaze
const EYE_TUNE: Record<
  EyeStyle,
  { size: number; open: number; gaze: number; sharp?: boolean }
> = {
  open: { size: 1, open: 1, gaze: 0 },
  wide: { size: 1.32, open: 1.05, gaze: 0.05 },
  sharp: { size: 1, open: 1, gaze: -0.1, sharp: true },
  sleepy: { size: 1, open: 0.42, gaze: 0.25 },
  happy: { size: 1, open: 1, gaze: 0 },
  dot: { size: 1, open: 1, gaze: 0 },
  wink: { size: 1.08, open: 1, gaze: 0 },
  derp: { size: 1.15, open: 1, gaze: 0.15 },
};

function eyePair(
  style: EyeStyle,
  hx: number,
  hy: number,
  r: number,
  line: string,
  skin: string,
  eid: string,
) {
  const T = EYE_TUNE[style];
  const bw = r * 0.34 * T.size;
  const bh = r * 0.4 * T.size;
  const near = { x: hx + r * 0.42, y: hy + r * 0.03, w: bw, h: bh, open: T.open };
  const far = {
    x: hx - r * 0.44,
    y: hy - r * 0.05,
    w: bw * 0.82,
    h: bh * 0.82,
    open: T.open,
  };
  // funny asymmetry
  if (style === "wink") far.open = 0;
  if (style === "derp") {
    far.w *= 0.7;
    far.h *= 0.7;
    far.y -= r * 0.06;
    far.x -= r * 0.03;
  }

  return (
    <g>
      {one(far, "f")}
      {one(near, "n")}
    </g>
  );

  function arc(x: number, y: number, w: number, h: number) {
    return (
      <path
        d={`M${x - w} ${y + h * 0.5} Q ${x} ${y - h * 1.2} ${x + w} ${y + h * 0.5}`}
        fill="none"
        stroke={line}
        strokeWidth={OW}
        strokeLinecap="round"
      />
    );
  }

  function one(
    e: { x: number; y: number; w: number; h: number; open: number },
    tag: string,
  ): ReactNode {
    const { x, y, w, h, open } = e;
    if (style === "dot")
      return (
        <g>
          <circle cx={x} cy={y} r={Math.min(w, h) * 0.85} fill={line} />
          <circle cx={x - w * 0.3} cy={y - h * 0.3} r={w * 0.3} fill="#fff" />
        </g>
      );
    if (style === "happy") return arc(x, y, w, h);
    if (open <= 0) return arc(x, y, w, h);

    const eyePath = `M${x - w} ${y + 1} Q ${x - w * 0.15} ${y - h * 1.3} ${x + w} ${y - h * 0.3} Q ${x + w * 0.1} ${y + h * 1.15} ${x - w} ${y + 1} Z`;
    const cpid = `${eid}-${tag}`;
    const pupY = y + h * (0.2 + T.gaze);
    // lid: a skin-coloured cap over the top of the eye when not fully open
    const lidY = y - h * 0.3 + (1 - open) * h * 1.9;
    const topLid = T.sharp
      ? `M${x - w} ${y + h * 0.2} Q ${x - w * 0.1} ${y - h * 1.1} ${x + w + 1} ${y - h * 0.05}`
      : `M${x - w} ${y + 1} Q ${x - w * 0.15} ${y - h * 1.35} ${x + w + 1} ${y - h * 0.35}`;
    return (
      <g>
        <path d={eyePath} fill="#fbfcff" />
        <clipPath id={cpid}>
          <path d={eyePath} />
        </clipPath>
        <g clipPath={`url(#${cpid})`}>
          <circle cx={x} cy={pupY} r={h * 1.25} fill={line} />
          <circle cx={x} cy={pupY} r={h * 0.72} fill="#160d1f" />
          <circle cx={x - w * 0.34} cy={pupY - h * 0.7} r={h * 0.44} fill="#fff" />
          <circle
            cx={x + w * 0.32}
            cy={pupY + h * 0.4}
            r={h * 0.22}
            fill="#fff"
            opacity="0.9"
          />
          {open < 0.95 && (
            <path
              d={`M${x - w - 2} ${y - h * 1.6} L${x + w + 2} ${y - h * 1.6} L${x + w + 2} ${lidY} Q ${x} ${lidY + h * 0.4} ${x - w - 2} ${lidY} Z`}
              fill={skin}
            />
          )}
        </g>
        <path
          d={
            open < 0.95
              ? `M${x - w} ${lidY} Q ${x} ${lidY + h * 0.5} ${x + w} ${lidY - h * 0.15}`
              : topLid
          }
          fill="none"
          stroke={line}
          strokeWidth={OW * 1.05}
          strokeLinecap="round"
        />
      </g>
    );
  }
}

function mouth(kind: string, hx: number, hy: number, r: number, line: string) {
  const my = hy + r * 0.5;
  const w = r * 0.2;
  if (kind === "beak")
    return (
      <path
        d={`M${hx - w * 1.7} ${my - 3} L${hx + w * 0.6} ${my + 7} L${hx + w * 1.9} ${my - 4} Q ${hx} ${my - 8} ${hx - w * 1.7} ${my - 3} Z`}
        fill="#efb43e"
        stroke={line}
        strokeWidth={IW}
        strokeLinejoin="round"
      />
    );
  if (kind === "cat")
    return (
      <path
        d={`M${hx - w * 1.6} ${my - 2} Q ${hx - w * 0.7} ${my + 4} ${hx} ${my - 1} Q ${hx + w * 0.7} ${my + 4} ${hx + w * 1.6} ${my - 2}`}
        fill="none"
        stroke={line}
        strokeWidth={IW * 1.4}
        strokeLinecap="round"
      />
    );
  if (kind === "open")
    return (
      <path
        d={`M${hx - w} ${my - 1} Q ${hx} ${my + w * 2.2} ${hx + w} ${my - 1} Q ${hx} ${my + 1} ${hx - w} ${my - 1} Z`}
        fill="#7a3247"
        stroke={line}
        strokeWidth={IW}
      />
    );
  if (kind === "flat")
    return (
      <path
        d={`M${hx - w} ${my} H${hx + w}`}
        stroke={line}
        strokeWidth={IW * 1.4}
        strokeLinecap="round"
      />
    );
  if (kind === "sing")
    return (
      <g>
        <ellipse
          cx={hx}
          cy={my + 1}
          rx={w * 0.9}
          ry={w * 1.4}
          fill="#7a3247"
          stroke={line}
          strokeWidth={IW}
        />
        <path
          d={`M${hx + w * 2.6} ${my - 6} l3 -12 l4 3`}
          fill="none"
          stroke={line}
          strokeWidth={IW * 1.3}
          strokeLinecap="round"
        />
        <circle cx={hx + w * 2.6} cy={my - 5} r="2.2" fill={line} />
      </g>
    );
  return (
    <path
      d={`M${hx - w} ${my - 1} q${w} ${w * 1.5} ${w * 2} 0`}
      fill="none"
      stroke={line}
      strokeWidth={IW * 1.4}
      strokeLinecap="round"
    />
  );
}

/* ---- head features (drawn behind the head, capped at y >= 6) ----- */

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

function feature(f: Feat, hx: number, hy: number, r: number, t: Tone): ReactNode {
  const top = Math.max(-10, hy - r);
  const S = (d: string, fill = t.hue, w = OW) => (
    <path
      d={d}
      fill={fill}
      stroke={t.line}
      strokeWidth={w}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
  switch (f) {
    case "ears":
      return (
        <g>
          {S(
            `M${hx - r * 0.72} ${top + 12} Q ${hx - r * 0.95} ${top - 8} ${hx - r * 0.3} ${top + 2} Z`,
          )}
          {S(
            `M${hx + r * 0.55} ${top + 10} Q ${hx + r * 0.9} ${top - 12} ${hx + r * 0.1} ${top - 2} Z`,
          )}
        </g>
      );
    case "roundears":
      return (
        <g>
          <circle cx={hx - r * 0.82} cy={top + 4} r={r * 0.42} fill={t.hue} stroke={t.line} strokeWidth={OW} />
          <circle cx={hx + r * 0.7} cy={top} r={r * 0.38} fill={t.hue} stroke={t.line} strokeWidth={OW} />
          <circle cx={hx - r * 0.82} cy={top + 5} r={r * 0.22} fill={t.shade} />
          <circle cx={hx + r * 0.7} cy={top + 1} r={r * 0.2} fill={t.shade} />
        </g>
      );
    case "leaf":
      return S(
        `M${hx + 2} ${top + 8} C${hx - 3} ${top - 6} ${hx - 15} ${top - 8} ${hx - 18} ${top - 20} C${hx - 4} ${top - 18} ${hx + 5} ${top - 4} ${hx + 2} ${top + 8} Z`,
        t.light,
      );
    case "tuft":
      return S(
        `M${hx - 12} ${top + 8} C${hx - 13} ${top - 8} ${hx - 3} ${top - 8} ${hx - 1} ${top + 1} C${hx + 3} ${top - 12} ${hx + 8} ${top - 6} ${hx + 13} ${top - 12} C${hx + 12} ${top + 2} ${hx + 6} ${top + 6} ${hx - 12} ${top + 8} Z`,
      );
    case "plume":
      return (
        <g>
          {S(`M${hx - 1} ${top + 8} L${hx - 5} ${top - 14} L${hx - 1} ${top - 8} L${hx + 3} ${top - 16} L${hx + 4} ${top - 4} Z`, t.light)}
          {S(`M${hx - 9} ${top + 8} L${hx - 13} ${top - 8} L${hx - 5} ${top - 4} Z`, t.light)}
        </g>
      );
    case "antler":
      return (
        <g stroke={t.line} strokeWidth={OW} strokeLinecap="round" fill="none">
          <path d={`M${hx - 6} ${top + 6} q-5 -12 -12 -17 m1 8 l-8 -4`} />
          <path d={`M${hx + 6} ${top + 6} q5 -12 12 -17 m-1 8 l8 -4`} />
        </g>
      );
    case "horn":
      return S(
        `M${hx} ${top + 4} L${hx - 6} ${Math.max(-12, top - 15)} L${hx + 6} ${Math.max(-12, top - 15)} Z`,
        t.light,
      );
    case "fin":
      return S(
        `M${hx - 13} ${top + 12} C${hx - 8} ${top - 6} ${hx + 8} ${top - 6} ${hx + 13} ${top + 12} C${hx + 4} ${top + 5} ${hx - 4} ${top + 5} ${hx - 13} ${top + 12} Z`,
      );
    case "bud":
      return (
        <g>
          <path d={`M${hx} ${top + 8} V${Math.max(-8, top - 6)}`} stroke={t.line} strokeWidth={OW} strokeLinecap="round" />
          <circle cx={hx} cy={Math.max(-12, top - 10)} r={r * 0.28} fill={t.light} stroke={t.line} strokeWidth={OW} />
        </g>
      );
    case "spark":
      return (
        <path
          d={`M${hx - 3} ${top + 8} L${hx + 5} ${Math.max(-12, top - 14)} L${hx} ${top - 4} L${hx + 8} ${top - 4} L${hx - 4} ${top + 16} L${hx + 1} ${top} L${hx - 6} ${top} Z`}
          fill="#ffd23f"
          stroke={t.line}
          strokeWidth={IW * 1.5}
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

/* ---- archetypes: 3/4 posed silhouettes -------------------------- */

interface Head {
  x: number;
  y: number;
  r: number;
}
interface Arch {
  back: Shape[];
  main: Shape[];
  /** shapes drawn on top of the body with the same cel treatment
   *  (turtle shell dome, hedgehog face) */
  over?: Shape[];
  head: Head;
}

// small quadruped, sitting turned 3/4 toward the viewer's right
const cub = (): Arch => ({
  back: [
    { p: "M40 96 C 22 96 14 82 18 66 C 20 54 30 48 40 50 C 30 58 30 78 44 88 Z" }, // tail curl
    { p: "M40 18 L 34 2 L 52 14 Z" }, // far ear
    { p: "M74 16 L 82 1 L 86 18 Z" }, // near ear
  ],
  main: [
    {
      p: "M62 12 C 44 12 34 24 34 42 C 34 50 37 56 43 60 C 28 64 18 82 22 98 C 25 110 40 112 58 112 C 82 112 92 102 92 86 C 92 70 84 60 74 56 C 82 52 88 44 88 34 C 88 22 78 12 62 12 Z",
    },
    { p: "M78 92 C 78 84 84 82 88 84 C 92 86 92 96 86 98 C 80 100 78 98 78 92 Z" }, // near front paw
    { p: "M58 96 q9 4 8 14 q-9 1 -12 -8 z" }, // near hind paw
  ],
  head: { x: 60, y: 36, r: 22 },
});

// bipedal kit, standing 3/4, big head, arms and a tail
const kit = (): Arch => ({
  back: [
    { p: "M36 74 C 18 78 10 60 16 44 C 20 34 32 32 40 38 C 30 46 30 66 44 76 Z" }, // tail
    { p: "M40 60 C 30 62 24 76 28 90 C 32 96 40 94 42 84 C 40 74 42 66 46 62 Z" }, // far arm
  ],
  main: [
    {
      p: "M58 10 C 40 10 30 24 30 42 C 30 52 35 60 43 64 C 32 70 26 84 28 98 C 30 110 42 116 60 116 C 80 116 90 108 90 94 C 90 80 82 70 72 66 C 80 62 86 52 86 40 C 86 22 76 10 58 10 Z",
    },
    { p: "M74 64 C 84 66 90 80 86 94 C 82 100 74 98 72 88 C 74 78 72 70 68 66 Z" }, // near arm
    { p: "M44 112 q-2 8 6 10 q9 -1 8 -10 z" }, // far foot
    { p: "M62 114 q0 9 9 9 q8 -2 6 -11 z" }, // near foot
  ],
  head: { x: 57, y: 36, r: 22 },
});

// plump bird, perched 3/4: one clean body-and-head outline, folded near wing
const bird = (): Arch => ({
  back: [
    { p: "M54 84 C 44 94 42 108 50 116 C 56 110 58 96 58 86 Z" }, // tail feather
    { p: "M66 84 C 66 96 72 110 82 114 C 86 104 80 90 74 82 Z" }, // tail feather
    { p: "M40 52 C 22 56 16 74 24 88 C 34 84 42 68 44 54 Z" }, // far wing
  ],
  main: [
    { p: "M40 108 q-2 8 4 10 M40 118 q-5 2 -8 6 M40 118 q3 4 3 8", in: true }, // near foot toes
    {
      p: "M56 16 C 40 16 31 30 30 46 C 24 54 22 72 28 88 C 33 102 46 108 58 108 C 76 108 90 98 91 78 C 92 62 86 48 78 42 C 77 28 70 16 56 16 Z",
    },
    { p: "M70 44 C 84 48 90 68 84 86 C 80 96 70 96 68 84 C 72 68 68 52 62 44 Z" }, // near wing
    { p: "M72 52 q9 6 8 20 M70 64 q8 5 7 16", in: true }, // feather lines
  ],
  head: { x: 52, y: 30, r: 16 },
});

// segmented bug, 3/4: teardrop abdomen, small head, three near legs
const bug = (): Arch => ({
  back: [
    { p: "M46 34 C 38 22 28 16 20 14 M54 32 C 52 18 48 10 42 4", in: true }, // antennae
    { p: "M34 58 C 22 58 14 66 12 74 M32 70 C 20 72 12 82 12 90 M38 82 C 28 88 24 98 26 106", in: true }, // far legs
  ],
  main: [
    {
      p: "M52 26 C 40 24 33 34 33 46 C 24 52 20 70 26 86 C 32 100 50 104 62 100 C 82 94 88 74 84 56 C 80 38 66 28 52 26 Z",
    },
    { p: "M66 56 C 80 56 88 66 90 76 M64 70 C 78 74 86 84 88 94 M60 84 C 72 90 78 100 78 110", in: true }, // near legs
    { p: "M42 54 q18 8 34 -1 M40 70 q20 9 38 -1", in: true }, // segments
  ],
  head: { x: 48, y: 38, r: 14 },
});

// turtle, 3/4: low body with the head craning out to the near side, dome shell
const shell = (): Arch => ({
  back: [{ p: "M28 82 C 18 86 14 96 20 102 C 26 104 32 96 32 88 Z" }], // tail
  main: [
    {
      p: "M88 50 C 100 48 100 32 86 30 C 74 28 68 38 68 48 C 44 40 18 52 16 74 C 15 90 32 98 54 98 C 82 98 96 86 94 68 C 93 58 92 52 88 50 Z",
    }, // body + head + neck
    { p: "M34 96 q-3 8 5 10 q9 0 9 -9 z" }, // far foot
    { p: "M68 96 q-2 9 7 10 q9 -1 8 -10 z" }, // near foot
  ],
  over: [
    { p: "M12 76 C 10 42 30 22 48 22 C 68 22 82 40 80 74 C 54 90 30 90 12 76 Z" }, // dome
    { p: "M20 64 C 36 55 54 55 72 64 M16 48 C 34 40 52 40 74 50 M46 24 V 82", in: true }, // plates
  ],
  head: { x: 86, y: 40, r: 13 },
});

// hedgehog, 3/4: a single spiky-backed silhouette, smooth face poking out low
const spike = (): Arch => ({
  back: [],
  main: [
    {
      p: "M30 96 C 22 88 20 70 24 56 L 20 40 L 34 50 L 30 30 L 46 46 L 46 22 L 60 44 L 66 24 L 74 46 L 84 34 L 84 56 C 88 68 88 84 82 94 C 76 104 36 104 30 96 Z",
    }, // spiky body
    { p: "M40 96 q-3 8 5 10 q9 0 9 -9 z" }, // near paw
  ],
  over: [
    {
      p: "M42 70 C 42 57 53 50 66 50 C 81 50 90 59 90 72 C 90 86 79 94 64 94 C 50 94 42 84 42 70 Z",
    }, // smooth face over the quills
  ],
  head: { x: 66, y: 72, r: 19 },
});

// lizard, 3/4 low stance: one flowing head + S-body + curling tail
const reptile = (): Arch => ({
  back: [{ p: "M30 52 q22 -10 44 0", in: true }], // faint back ridge shows through
  main: [
    {
      p: "M18 44 C 8 42 8 28 22 28 C 34 28 40 38 42 48 C 60 44 84 46 90 60 C 102 56 108 40 100 28 C 112 40 110 70 88 78 C 74 84 52 84 42 80 C 30 82 16 74 14 60 C 13 52 13 46 18 44 Z",
    },
    { p: "M30 74 q-3 9 6 11 q9 -1 8 -10 z" }, // near foreleg
    { p: "M62 78 q-2 10 8 11 q9 -1 7 -11 z" }, // near hindleg
  ],
  head: { x: 24, y: 42, r: 12 },
});

// amorphous critter: a teardrop that tapers up, soft lobed base, stubby arms
const sprite = (): Arch => ({
  back: [
    { p: "M22 62 C 10 64 6 80 12 92 C 18 96 26 92 26 80 C 24 72 22 66 22 62 Z" }, // far arm
  ],
  main: [
    {
      p: "M52 10 C 34 10 24 28 22 48 C 20 66 18 84 24 96 C 28 104 36 102 42 92 C 46 102 56 102 60 92 C 66 102 74 104 78 94 C 84 80 84 60 82 46 C 80 26 70 10 52 10 Z",
    },
    { p: "M82 60 C 94 62 98 78 92 90 C 86 94 78 90 78 78 C 80 70 80 64 82 60 Z" }, // near arm
  ],
  head: { x: 51, y: 46, r: 29 },
});

// mole: a squat digger with big front claws and a blunt snout
const mole = (): Arch => ({
  back: [],
  main: [
    {
      p: "M24 98 C 14 88 14 60 28 50 C 44 38 76 38 92 50 C 106 60 106 88 96 98 C 84 108 36 108 24 98 Z",
    },
    {
      p: "M22 60 C 8 58 2 74 8 92 C 12 100 22 98 24 88 L 28 96 L 30 82 L 34 92 L 36 78 C 34 70 28 64 22 60 Z",
    }, // far claw
    {
      p: "M96 58 C 110 56 116 72 110 90 C 106 98 96 96 94 86 L 90 94 L 88 80 L 84 90 L 82 76 C 84 68 90 60 96 58 Z",
    }, // near claw
    { c: [60, 66, 13, 9] }, // snout
  ],
  head: { x: 58, y: 56, r: 18 },
});

// squirrel: upright, small, with a huge curled bushy tail sweeping up behind
const squirrel = (): Arch => ({
  back: [
    {
      p: "M34 106 C 2 100 -6 50 16 24 C 28 8 54 8 60 28 C 42 34 28 60 34 82 C 37 96 46 102 54 102 C 46 110 40 108 34 106 Z",
    }, // tail
  ],
  main: [
    {
      p: "M58 12 C 40 12 30 28 30 46 C 30 56 36 62 44 64 C 33 70 27 86 31 102 C 35 114 49 118 62 116 C 80 114 88 102 86 88 C 84 76 78 68 70 64 C 80 60 84 48 84 36 C 84 20 74 12 58 12 Z",
    },
    { p: "M66 62 C 76 64 82 80 78 96 C 74 102 66 100 64 90 C 66 80 64 70 60 64 Z" }, // arm to chest
    { p: "M42 114 q-2 8 6 10 q9 -1 8 -10 z" },
    { p: "M62 116 q0 9 9 9 q8 -2 6 -11 z" },
  ],
  head: { x: 57, y: 32, r: 20 },
});

// orb: a near-spherical, head-dominant critter with a tiny body
const orb = (): Arch => ({
  back: [],
  main: [
    {
      p: "M60 8 C 30 8 12 34 12 64 C 12 94 34 112 60 112 C 86 112 108 94 108 64 C 108 34 90 8 60 8 Z",
    },
    { p: "M44 110 q-2 7 5 9 q8 -1 7 -9 z" },
    { p: "M70 110 q0 8 8 8 q7 -2 5 -9 z" },
  ],
  head: { x: 60, y: 56, r: 42 },
});

// swift: a sleek bird mid-dart, tilted forward, swept wings, forked tail
const swift = (): Arch => ({
  back: [
    { p: "M54 84 L 40 120 L 55 104 L 66 120 L 62 86 Z" }, // forked tail
    { p: "M46 48 C 12 40 -2 60 6 88 C 26 86 44 66 48 48 Z" }, // far swept wing
  ],
  main: [
    {
      p: "M64 20 C 46 20 36 34 34 54 C 32 72 36 88 48 96 C 60 102 76 94 80 76 C 84 56 82 32 74 24 C 71 21 67 20 64 20 Z",
    },
    { p: "M72 38 C 100 30 116 50 110 80 C 90 78 72 60 68 40 Z" }, // near swept wing
    { c: [44, 98, 5, 4] },
    { c: [56, 100, 5, 4] },
  ],
  head: { x: 56, y: 28, r: 15 },
});

// glide: membrane wings spread flat, a wide low body, calm
const glide = (): Arch => ({
  back: [
    { p: "M40 54 C 0 42 -18 58 -8 76 C 18 80 42 66 46 54 Z" }, // far wing
    { p: "M54 94 C 48 108 52 122 60 122 C 64 112 62 98 60 92 Z" }, // stub tail
  ],
  main: [
    {
      p: "M60 28 C 42 28 32 42 32 60 C 32 78 42 94 60 96 C 78 94 88 78 88 60 C 88 42 78 28 60 28 Z",
    },
    { p: "M80 52 C 120 40 138 56 128 74 C 102 78 82 64 78 52 Z" }, // near wing
    { c: [50, 96, 5, 4] },
    { c: [70, 96, 5, 4] },
  ],
  head: { x: 60, y: 34, r: 16 },
});

// lark: puffed chest, upright, head tipped back to sing
const lark = (): Arch => ({
  back: [
    { p: "M46 44 C 22 42 12 62 20 86 C 38 84 50 66 52 46 Z" }, // wing swept up
    { p: "M62 92 C 56 108 60 122 68 122 C 74 112 70 96 66 90 Z" },
  ],
  main: [
    {
      p: "M58 18 C 38 20 28 40 28 62 C 28 84 40 100 58 102 C 78 100 90 84 90 60 C 90 38 78 20 58 18 Z",
    },
    { p: "M76 42 C 100 42 108 62 104 84 C 88 82 76 64 74 44 Z" }, // near wing
    { c: [50, 102, 5, 4] },
    { c: [66, 102, 5, 4] },
  ],
  head: { x: 54, y: 26, r: 15 },
});

// tumble: a fuzzy ball with four stubby paws poked out, slightly askew
const tumble = (): Arch => ({
  back: [
    {
      p: "M30 34 L 14 20 M28 92 L 12 106 M92 36 L 108 22 M90 88 L 106 102",
      in: true,
    },
  ],
  main: [
    { c: [60, 62, 41, 40] },
    { c: [22, 30, 9, 7] },
    { c: [24, 96, 9, 7] },
    { c: [100, 32, 9, 7] },
    { c: [96, 94, 9, 7] },
    { p: "M32 44 Q 60 30 90 46 M30 66 Q 60 54 92 70 M46 30 Q 58 60 50 96", in: true },
  ],
  head: { x: 60, y: 56, r: 33 },
});

// pod: an upright seed-pod, pointed top and bottom, thorns out the sides
const pod = (): Arch => ({
  back: [
    {
      p: "M30 50 L 12 44 L 30 40 Z M32 72 L 14 78 L 32 82 Z M90 50 L 108 44 L 90 40 Z M88 72 L 106 78 L 88 82 Z",
    },
  ],
  main: [
    {
      p: "M60 4 C 42 20 32 46 32 68 C 32 94 44 114 60 120 C 76 114 88 94 88 68 C 88 46 78 20 60 4 Z",
    },
    { p: "M40 74 C 50 80 70 80 80 74", in: true }, // crossed-arm seam
  ],
  head: { x: 60, y: 50, r: 19 },
});

// clam: a coiled shell disc with a soft body and face poking out the base
const clam = (): Arch => ({
  back: [],
  main: [
    { c: [66, 54, 34, 34] }, // shell disc
    {
      p: "M42 76 C 26 82 20 100 32 110 C 46 116 58 104 54 90 C 50 94 46 84 42 76 Z",
    }, // body poking out
  ],
  over: [
    {
      p: "M64 26 C 46 24 34 38 36 56 C 38 72 54 78 66 72 M64 38 C 54 38 50 48 55 56 C 60 62 68 58 68 52",
      in: true,
    },
  ],
  head: { x: 40, y: 92, r: 12 },
});

// chub: an over-fed hoarder, huge and round with stuffed cheeks
const chub = (): Arch => ({
  back: [],
  main: [
    {
      p: "M60 22 C 32 22 18 46 18 76 C 18 102 38 118 60 118 C 82 118 102 102 102 76 C 102 46 88 22 60 22 Z",
    },
    { c: [38, 44, 13, 12] },
    { c: [82, 44, 13, 12] },
    { p: "M42 116 q-2 7 6 8 q8 -1 7 -8 z" },
    { p: "M64 116 q0 8 8 8 q7 -2 5 -8 z" },
  ],
  head: { x: 60, y: 50, r: 26 },
});

// mist: a fox-wisp, ears up top, body scalloping into fog at the base
const mist = (): Arch => ({
  back: [
    { c: [22, 66, 8, 10] },
    { p: "M40 40 L 32 20 L 50 34 Z" }, // far ear
    { p: "M62 40 L 72 20 L 54 34 Z" }, // near ear
  ],
  main: [
    {
      p: "M52 14 C 34 14 24 32 22 52 C 20 68 20 84 24 92 C 26 98 32 98 36 90 C 38 98 46 100 50 90 C 54 100 62 100 66 90 C 70 98 78 98 80 90 C 84 78 84 60 82 48 C 80 28 70 14 52 14 Z",
    },
    { c: [82, 62, 8, 10] },
  ],
  head: { x: 51, y: 48, r: 28 },
});

// quill: standing tall, long dramatic quills swept back off the body
const quill = (): Arch => ({
  back: [
    { p: "M40 44 L 6 8 L 24 44 L 2 30 L 22 56 L 0 56 L 26 66 Z" },
    { p: "M60 30 L 66 -2 L 74 26 L 90 2 L 84 36 L 104 24 L 88 48 Z" },
  ],
  main: [
    {
      p: "M60 32 C 42 32 32 50 32 74 C 32 98 44 116 60 116 C 76 116 88 98 88 74 C 88 50 78 32 60 32 Z",
    },
    { p: "M44 114 q-2 8 6 9 q8 -1 7 -9 z" },
    { p: "M64 114 q0 9 8 9 q7 -2 5 -9 z" },
  ],
  head: { x: 60, y: 56, r: 22 },
});

const ARCH: Record<string, () => Arch> = {
  cub,
  kit,
  bird,
  bug,
  shell,
  spike,
  reptile,
  sprite,
  mole,
  squirrel,
  orb,
  swift,
  glide,
  lark,
  tumble,
  pod,
  clam,
  chub,
  mist,
  quill,
};

/* ---- roster --------------------------------------------------- */

interface Spec {
  arch: string;
  feat: Feat;
  eye: EyeStyle;
  mouth: string;
  belly: boolean;
}

const SPEC: Record<CreatureId, Spec> = {
  boulderpup: { arch: "cub", feat: "ears", eye: "wide", mouth: "open", belly: true },
  mossback: { arch: "shell", feat: "leaf", eye: "sleepy", mouth: "smile", belly: false },
  slumberstone: { arch: "sprite", feat: "tuft", eye: "sleepy", mouth: "smile", belly: false },
  mudpaw: { arch: "cub", feat: "roundears", eye: "open", mouth: "flat", belly: true },
  slatetusk: { arch: "reptile", feat: "horn", eye: "sharp", mouth: "flat", belly: false },
  lichenox: { arch: "chub", feat: "leaf", eye: "sleepy", mouth: "smile", belly: true },

  breezefinch: { arch: "bird", feat: "plume", eye: "open", mouth: "beak", belly: true },
  tumbleweed: { arch: "tumble", feat: "tuft", eye: "derp", mouth: "smile", belly: false },
  glidewing: { arch: "glide", feat: "none", eye: "sharp", mouth: "beak", belly: true },
  driftmink: { arch: "mist", feat: "none", eye: "wide", mouth: "cat", belly: false },
  galepup: { arch: "cub", feat: "ears", eye: "derp", mouth: "open", belly: true },
  dandypuff: { arch: "sprite", feat: "plume", eye: "happy", mouth: "smile", belly: false },

  snoozemouse: { arch: "cub", feat: "roundears", eye: "sleepy", mouth: "smile", belly: true },
  fogkit: { arch: "mist", feat: "none", eye: "sleepy", mouth: "smile", belly: false },
  dozderling: { arch: "kit", feat: "antler", eye: "sleepy", mouth: "flat", belly: false },
  drowsivole: { arch: "mole", feat: "none", eye: "sleepy", mouth: "flat", belly: false },
  lullabird: { arch: "lark", feat: "plume", eye: "sleepy", mouth: "sing", belly: false },
  dreamnewt: { arch: "reptile", feat: "fin", eye: "sleepy", mouth: "smile", belly: false },

  nutsquirrel: { arch: "squirrel", feat: "tuft", eye: "wide", mouth: "open", belly: true },
  acorncache: { arch: "chub", feat: "leaf", eye: "happy", mouth: "smile", belly: true },
  sunbeetle: { arch: "bug", feat: "horn", eye: "open", mouth: "smile", belly: false },
  tallykit: { arch: "kit", feat: "ears", eye: "sharp", mouth: "flat", belly: true },
  sunmoth: { arch: "bug", feat: "plume", eye: "happy", mouth: "smile", belly: false },
  emberfinch: { arch: "bird", feat: "tuft", eye: "wide", mouth: "beak", belly: true },

  pricklehog: { arch: "spike", feat: "none", eye: "happy", mouth: "smile", belly: false },
  shellclam: { arch: "clam", feat: "none", eye: "wide", mouth: "smile", belly: false },
  barknewt: { arch: "reptile", feat: "fin", eye: "sharp", mouth: "smile", belly: false },
  thornpod: { arch: "pod", feat: "bud", eye: "sharp", mouth: "flat", belly: false },
  quillhog: { arch: "quill", feat: "none", eye: "open", mouth: "open", belly: false },
  barkmole: { arch: "mole", feat: "none", eye: "sharp", mouth: "flat", belly: false },

  swiftwren: { arch: "swift", feat: "plume", eye: "wide", mouth: "beak", belly: true },
  digmole: { arch: "mole", feat: "none", eye: "dot", mouth: "smile", belly: false },
  wildlark: { arch: "lark", feat: "plume", eye: "happy", mouth: "sing", belly: false },
  bombkit: { arch: "orb", feat: "spark", eye: "derp", mouth: "cat", belly: false },
  joltjay: { arch: "swift", feat: "spark", eye: "sharp", mouth: "beak", belly: false },
  sparkpaw: { arch: "kit", feat: "spark", eye: "wink", mouth: "cat", belly: false },
};

export function Critter({ id, size = 44 }: { id: CreatureId; size?: number }) {
  const uid = useId();
  const spec = SPEC[id];
  const cat = ROSTER[id].category;
  const sibIdx = creaturesByCategory(cat).findIndex((c) => c.id === id);
  const t = toneOf(siblingHue(CATEGORIES[cat].hue, Math.max(0, sibIdx)));
  const a = ARCH[spec.arch]();
  const h = a.head;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -16 120 148"
      role="img"
      aria-label={ROSTER[id].name}
    >
      <ellipse cx="58" cy="118" rx="34" ry="5" fill="#00000016" />

      {feature(spec.feat, h.x, h.y, h.r, t)}
      {a.back.length > 0 && <Cel cid={`${uid}-k`} shapes={a.back} t={t} />}
      <Cel cid={`${uid}-m`} shapes={a.main} t={t} />
      {a.over && a.over.length > 0 && (
        <Cel cid={`${uid}-o`} shapes={a.over} t={t} />
      )}

      {spec.belly && (
        <ellipse
          cx={h.x - h.r * 0.05}
          cy={h.y + h.r * 1.05}
          rx={h.r * 0.6}
          ry={h.r * 0.7}
          fill={t.light}
          opacity="0.9"
        />
      )}

      {eyePair(spec.eye, h.x, h.y, h.r, t.line, t.hue, `${uid}-e`)}
      {mouth(spec.mouth, h.x, h.y, h.r, t.line)}

      <circle cx={h.x - h.r * 0.72} cy={h.y + h.r * 0.36} r={h.r * 0.15} fill="#ff90b0" opacity="0.5" />
      <circle cx={h.x + h.r * 0.78} cy={h.y + h.r * 0.32} r={h.r * 0.16} fill="#ff90b0" opacity="0.5" />
    </svg>
  );
}
