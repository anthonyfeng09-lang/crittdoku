import { CATEGORIES, ROSTER, type CreatureId, creaturesByCategory } from "../engine";
import { tungStyle, type TungStyle } from "./tung";

/* A "tung tung tung sahur": a stubby wooden-bat body, twig limbs, a big goofy
 * face, always a bit wrong in the proportions. One family, but every critter
 * gets its own silhouette - body shape, arm pose, leg pose, mouth, head tilt,
 * skew, scale, flip - plus its own prop / hat / held object, so no two read
 * alike. The critter's type still tints the scarf so you can tell them apart. */

const WOOD_D = "#7c4f28";
const WOOD_L = "#d8b483";
const INK = "#241b2e";

/* ---- bodies: silhouette + where the face sits + top-of-head y ---- */
const BODY: Record<string, { d: string; fx: number; fy: number; topY: number }> = {
  fat: {
    d: "M40 30C38 14 50 6 60 6s22 8 20 24c-2 12 6 34 6 58 0 22-12 34-26 34S38 108 38 86c0-24 4-42 2-56Z",
    fx: 60,
    fy: 50,
    topY: 8,
  },
  tall: {
    d: "M48 20C47 8 54 2 60 2s13 6 12 18c-1 16 5 44 5 74 0 18-8 28-17 28s-17-10-17-28c0-30 1-56 0-74Z",
    fx: 60,
    fy: 46,
    topY: 4,
  },
  lumpy: {
    d: "M40 34C36 18 50 6 62 8c10 2 16 12 15 24 7 4 6 20-1 25 7 7 6 22-1 28 5 10-1 25-15 25-12 0-19-12-19-25 4-7 1-17-3-21 6-7 6-21-1-27-3-6 6-4 6-8 1-8 15-9 18-4Z",
    fx: 60,
    fy: 44,
    topY: 8,
  },
  crook: {
    d: "M44 30C40 14 52 4 62 6s20 12 15 26c-4 12-15 22-13 39 2 16 14 24 12 40-2 14-16 21-27 15-9-6-9-19-3-29 8-14 20-21 18-39-1-14-14-19-14-27Z",
    fx: 62,
    fy: 42,
    topY: 6,
  },
  peanut: {
    d: "M42 26C40 12 50 4 60 4s20 8 18 22c-1 8-6 14-6 22 0 6 6 12 7 22 2 16-6 32-19 32S39 90 41 74c1-10 7-16 7-22 0-8-5-14-6-22Z",
    fx: 60,
    fy: 42,
    topY: 6,
  },
  chonk: {
    d: "M32 46C32 22 43 8 60 8s28 14 28 38c0 24-11 40-28 40S32 70 32 46Z",
    fx: 60,
    fy: 44,
    topY: 10,
  },
};

function Arms({ pose }: { pose: string }) {
  const st = { stroke: WOOD_D, strokeWidth: 5, strokeLinecap: "round" as const, fill: "none" };
  const hand = (x: number, y: number) => <circle cx={x} cy={y} r="4.6" fill={WOOD_D} />;
  switch (pose) {
    case "up":
      return (
        <g>
          <path d="M36 78q-14 -12 -16 -30M84 78q14 -12 16 -30" {...st} />
          {hand(20, 46)}
          {hand(100, 46)}
        </g>
      );
    case "wave":
      return (
        <g>
          <path d="M36 82q-12 6 -14 16M84 78q14 -14 20 -34" {...st} />
          {hand(22, 100)}
          {hand(104, 42)}
        </g>
      );
    case "cross":
      return (
        <g>
          <path d="M38 82q10 8 24 3M82 82q-10 8 -24 3" {...st} />
          {hand(58, 86)}
          {hand(62, 86)}
        </g>
      );
    case "out":
      return (
        <g>
          <path d="M36 84q-16 -2 -22 -6M84 84q16 -2 22 -6" {...st} />
          {hand(12, 77)}
          {hand(108, 77)}
        </g>
      );
    case "hips":
      return (
        <g>
          <path d="M38 80q-13 1 -15 12q10 7 17 -1M82 80q13 1 15 12q-10 7 -17 -1" {...st} />
        </g>
      );
    default: // down
      return (
        <g>
          <path d="M36 84q-10 6 -12 18M84 84q10 6 12 18" {...st} />
          {hand(23, 104)}
          {hand(97, 104)}
        </g>
      );
  }
}

function Legs({ pose }: { pose: string }) {
  const st = { stroke: WOOD_D, strokeWidth: 5.5, strokeLinecap: "round" as const, fill: "none" };
  const foot = (x: number, y: number, w = 8) => <ellipse cx={x} cy={y} rx={w} ry={4} fill={WOOD_D} />;
  switch (pose) {
    case "step":
      return (
        <g>
          <path d="M52 118l-11 16M68 118l10 11" {...st} />
          {foot(37, 135)}
          {foot(81, 130)}
        </g>
      );
    case "sit":
      return (
        <g>
          <path d="M48 116q-15 5 -15 17M72 116q15 5 15 17" {...st} />
          {foot(31, 134, 10)}
          {foot(89, 134, 10)}
        </g>
      );
    case "hop":
      return (
        <g>
          <path d="M52 115q-6 8 -2 15M68 115q6 8 2 15" {...st} />
          {foot(48, 132)}
          {foot(72, 132)}
        </g>
      );
    case "wide":
      return (
        <g>
          <path d="M50 118l-17 15M70 118l17 15" {...st} />
          {foot(29, 134, 10)}
          {foot(91, 134, 10)}
        </g>
      );
    case "tip":
      return (
        <g>
          <path d="M54 118l-4 17M66 118l4 17" {...st} />
          {foot(48, 136, 6)}
          {foot(72, 136, 6)}
        </g>
      );
    default: // stand
      return (
        <g>
          <path d="M52 118l-6 15M68 118l6 15" {...st} />
          {foot(43, 135)}
          {foot(77, 135)}
        </g>
      );
  }
}

function Eyes({ kind, fx, fy }: { kind: string; fx: number; fy: number }) {
  const L = fx - 14;
  const R = fx + 14;
  const white = (cx: number, cy: number, r = 11) => (
    <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.14} fill="#fff" stroke={INK} strokeWidth="2.4" />
  );
  const pupil = (cx: number, cy: number, r = 4.4) => <circle cx={cx} cy={cy} r={r} fill={INK} />;
  if (kind === "cross")
    return (
      <g>
        {white(L, fy)}
        {white(R, fy)}
        <path d={`M${L - 6} ${fy - 5}l12 10M${L + 6} ${fy - 5}l-12 10`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d={`M${R - 6} ${fy - 5}l12 10M${R + 6} ${fy - 5}l-12 10`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  if (kind === "spiral")
    return (
      <g>
        {white(L, fy)}
        {white(R, fy)}
        <path d={`M${L} ${fy}a4 4 0 1 1 -3 -4 6 6 0 1 1 5 7`} fill="none" stroke={INK} strokeWidth="2.6" />
        <path d={`M${R} ${fy}a4 4 0 1 1 -3 -4 6 6 0 1 1 5 7`} fill="none" stroke={INK} strokeWidth="2.6" />
      </g>
    );
  if (kind === "sleepy")
    return (
      <g>
        {white(L, fy + 1, 10)}
        {white(R, fy + 1, 10)}
        <path d={`M${L - 9} ${fy + 1}q9 7 18 0M${R - 9} ${fy + 1}q9 7 18 0`} fill="#c99b6d" />
        <path d={`M${L - 9} ${fy + 1}q9 7 18 0M${R - 9} ${fy + 1}q9 7 18 0`} fill="none" stroke={INK} strokeWidth="2.6" />
        {pupil(L, fy + 4, 3)}
        {pupil(R, fy + 4, 3)}
      </g>
    );
  if (kind === "dots")
    return (
      <g>
        <circle cx={L} cy={fy + 1} r="4.6" fill={INK} />
        <circle cx={R} cy={fy + 1} r="4.6" fill={INK} />
      </g>
    );
  if (kind === "wide")
    return (
      <g>
        {white(L - 1, fy - 1, 14)}
        {white(R + 1, fy - 1, 14)}
        {pupil(L - 1, fy + 1, 5.5)}
        {pupil(R + 1, fy + 1, 5.5)}
        <circle cx={L - 4} cy={fy - 3} r="2.6" fill="#fff" />
        <circle cx={R - 2} cy={fy - 3} r="2.6" fill="#fff" />
      </g>
    );
  // goofy: mismatched, looking different ways
  return (
    <g>
      {white(L, fy, 12)}
      {white(R + 1, fy - 2, 8.5)}
      {pupil(L + 4, fy + 3, 4.6)}
      {pupil(R - 2, fy - 5, 3.4)}
      <circle cx={L - 3} cy={fy - 3} r="2.4" fill="#fff" />
    </g>
  );
}

function Mouth({ kind, fx, fy }: { kind: string; fx: number; fy: number }) {
  const y = fy + 17;
  if (kind === "grin")
    return <path d={`M${fx - 12} ${y - 2}q12 12 24 0q-6 8 -12 8q-6 0 -12 -8z`} fill="#7a3247" stroke={INK} strokeWidth="2" />;
  if (kind === "flat") return <path d={`M${fx - 9} ${y}h18`} stroke={INK} strokeWidth="3" strokeLinecap="round" />;
  if (kind === "wobble")
    return <path d={`M${fx - 11} ${y}q5 -6 11 0t11 0`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />;
  if (kind === "tiny") return <ellipse cx={fx} cy={y} rx="3.5" ry="3" fill={INK} />;
  if (kind === "gape") return <ellipse cx={fx} cy={y + 1} rx="8" ry="10" fill="#7a3247" stroke={INK} strokeWidth="2.4" />;
  // o
  return <ellipse cx={fx} cy={y} rx="5.5" ry="7" fill="#7a3247" stroke={INK} strokeWidth="2.4" />;
}

function Hat({ kind, fx, topY, hue }: { kind: string; fx: number; topY: number; hue: string }) {
  const y = topY + 2;
  if (kind === "none") return null;
  if (kind === "cap")
    return (
      <g>
        <path d={`M${fx - 18} ${y + 4}q18 -16 36 0z`} fill={hue} stroke={INK} strokeWidth="2.6" />
        <path d={`M${fx + 14} ${y + 4}q14 1 18 6q-10 3 -18 0z`} fill={hue} stroke={INK} strokeWidth="2.6" />
      </g>
    );
  if (kind === "cone")
    return (
      <g>
        <path d={`M${fx} ${y - 26}l14 30h-28z`} fill={hue} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx={fx} cy={y - 26} r="4" fill="#fff" stroke={INK} strokeWidth="2" />
      </g>
    );
  if (kind === "leaf")
    return (
      <path
        d={`M${fx} ${y + 4}C${fx - 10} ${y + 4} ${fx - 16} ${y - 10} ${fx - 12} ${y - 22}C${fx - 2} ${y - 18} ${fx + 6} ${y - 8} ${fx} ${y + 4}Z`}
        fill="#4caf50"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    );
  if (kind === "crown")
    return (
      <path
        d={`M${fx - 20} ${y + 4}l4 -16l8 8l6 -12l6 12l8 -8l4 16z`}
        fill="#ffd23f"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    );
  if (kind === "bucket")
    return (
      <g>
        <path d={`M${fx - 18} ${y - 12}h36l-4 18h-28z`} fill="#bcbec2" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <rect x={fx - 20} y={y - 16} width={40} height={6} rx={3} fill="#d7d9dd" stroke={INK} strokeWidth="2.4" />
      </g>
    );
  if (kind === "halo") return <ellipse cx={fx} cy={y - 16} rx={20} ry={6} fill="none" stroke="#ffe38a" strokeWidth="5" />;
  // band
  return (
    <g>
      <path d={`M${fx - 20} ${y + 6}q20 -10 40 0`} fill="none" stroke={hue} strokeWidth="7" strokeLinecap="round" />
      <circle cx={fx - 20} cy={y + 6} r="4" fill={hue} stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Hold({ kind }: { kind: string }) {
  if (kind === "none") return null;
  if (kind === "bat")
    return (
      <g transform="translate(100 104) rotate(28)">
        <path d="M0 0q4 -30 3 -40q-3 -3 -6 0q-1 10 3 40z" fill="#a9743f" stroke={INK} strokeWidth="2.6" />
        <rect x={-4} y={-2} width={8} height={8} rx={2} fill={WOOD_D} stroke={INK} strokeWidth="2" />
      </g>
    );
  if (kind === "stick") return <path d="M100 104l14 -22" stroke={WOOD_D} strokeWidth="4.5" strokeLinecap="round" />;
  if (kind === "flag")
    return (
      <g transform="translate(100 104)">
        <path d="M0 4l0 -34" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M0 -30l18 6l-18 8z" fill="#f43f5e" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      </g>
    );
  if (kind === "spoon")
    return (
      <g transform="translate(100 104) rotate(20)">
        <path d="M0 0l0 -26" stroke="#c9cdd3" strokeWidth="3.4" strokeLinecap="round" />
        <ellipse cx={0} cy={-30} rx={6} ry={8} fill="#e6e9ee" stroke={INK} strokeWidth="2.2" />
      </g>
    );
  // phone
  return (
    <g transform="translate(100 100) rotate(-8)">
      <rect x={-7} y={-13} width={14} height={26} rx={3} fill="#2b2233" stroke={INK} strokeWidth="2" />
      <rect x={-5} y={-10} width={10} height={18} rx={1} fill="#7fd4ff" />
    </g>
  );
}

function Prop({ kind }: { kind: string }) {
  if (kind === "none") return <ellipse cx={60} cy={140} rx={26} ry={5} fill="#00000018" />;
  if (kind === "cloud")
    return (
      <path
        d="M28 140q-11 0 -11 -10q0 -9 10 -9q1 -11 14 -11q8 0 12 7q4 -3 10 -3q11 0 12 11q10 0 10 9q0 6 -9 6z"
        fill="#fff"
        stroke={INK}
        strokeWidth="2.4"
      />
    );
  if (kind === "rock")
    return (
      <path
        d="M24 143q-6 -14 12 -16q6 -8 20 -4q15 -3 22 8q11 2 6 12z"
        fill="#b8bcc4"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    );
  if (kind === "pad")
    return (
      <g>
        <ellipse cx={60} cy={141} rx={32} ry={9} fill="#5fbf5a" stroke={INK} strokeWidth="2.4" />
        <path d="M60 141l10 -6" stroke="#2f7a2c" strokeWidth="2.2" />
      </g>
    );
  if (kind === "stump")
    return (
      <g>
        <ellipse cx={60} cy={138} rx={22} ry={7} fill={WOOD_L} stroke={INK} strokeWidth="2.4" />
        <rect x={38} y={138} width={44} height={10} rx={3} fill="#a9743f" stroke={INK} strokeWidth="2.4" />
      </g>
    );
  // puddle
  return <ellipse cx={60} cy={141} rx={32} ry={8} fill="#8fd4e8" stroke={INK} strokeWidth="2.2" />;
}

export function Tung({ id, size = 44 }: { id: CreatureId; size?: number }) {
  const s: TungStyle = tungStyle(id);
  const cat = ROSTER[id].category;
  const hue = CATEGORIES[cat].hue;
  const sib = creaturesByCategory(cat).findIndex((c) => c.id === id);
  const wood = sib % 3 === 1 ? "#b9884f" : sib % 3 === 2 ? "#9a6636" : "#a9743f";
  const b = BODY[s.body] ?? BODY.fat;

  return (
    <svg width={size} height={size} viewBox="0 -16 120 162" role="img" aria-label={id}>
      <Prop kind={s.prop} />
      <g
        transform={`translate(60 76) scale(${s.flip ? -s.scale : s.scale} ${s.scale}) rotate(${s.lean}) skewX(${s.skew}) translate(-60 ${-76 + s.bob})`}
      >
        <Legs pose={s.legs} />
        <Arms pose={s.arms} />
        {/* the wooden bat body */}
        <path d={b.d} fill={wood} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        {/* wood grain */}
        <path
          d={`M${b.fx - 8} ${b.fy - 8}q8 4 16 0M${b.fx - 10} ${b.fy + 14}q10 5 20 0M${b.fx - 8} ${b.fy + 36}q8 4 16 0`}
          fill="none"
          stroke={WOOD_D}
          strokeWidth="2"
          opacity="0.55"
        />
        {/* type scarf */}
        <path
          d={`M${b.fx - 20} ${b.fy + 24}q20 10 40 0l-2 9q-18 8 -36 0z`}
          fill={hue}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* head: face + hat, tilted on its own */}
        <g transform={`rotate(${s.headTilt} ${b.fx} ${b.fy})`}>
          <Hat kind={s.hat} fx={b.fx} topY={b.topY} hue={hue} />
          <Eyes kind={s.eyes} fx={b.fx} fy={b.fy} />
          <ellipse cx={b.fx} cy={b.fy + 9} rx="5" ry="6.5" fill={INK} />
          <ellipse cx={b.fx} cy={b.fy + 7} rx="2.4" ry="3" fill="#7a3247" />
          <circle cx={b.fx - 15} cy={b.fy + 5} r="3.4" fill="#ff9db6" opacity="0.5" />
          <circle cx={b.fx + 15} cy={b.fy + 5} r="3.4" fill="#ff9db6" opacity="0.5" />
          <Mouth kind={s.mouth} fx={b.fx} fy={b.fy} />
        </g>
        <Hold kind={s.hold} />
      </g>
    </svg>
  );
}
