import { type ReactNode } from "react";
import { CATEGORIES, ROSTER, CreatureId, Category } from "../engine";

/* Every critter is hand-drawn as its own little creature: its own pose, its own
 * eyes, its own silhouette. Shared helpers are only for eyes and the ground
 * shadow. All art is original and not traced from any franchise. */

const INK: Record<Category, string> = {
  anchor: "#14532d",
  drift: "#155e75",
  hush: "#581c87",
  thrift: "#7c2d12",
  ward: "#9f1239",
  snap: "#7c2d12",
};

interface P {
  hue: string;
  ink: string;
}

const EYE = "#241826";

/* ---- eyes ------------------------------------------------------------ */

function bright(x: number, y: number, s = 4): ReactNode {
  return (
    <g>
      <circle cx={x} cy={y} r={s} fill={EYE} />
      <circle cx={x - s * 0.34} cy={y - s * 0.42} r={s * 0.42} fill="#fff" />
      <circle cx={x + s * 0.32} cy={y + s * 0.36} r={s * 0.2} fill="#fff" opacity="0.85" />
    </g>
  );
}
function wide(x: number, y: number, s = 5): ReactNode {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={s * 0.86} ry={s} fill={EYE} />
      <circle cx={x - s * 0.3} cy={y - s * 0.45} r={s * 0.36} fill="#fff" />
    </g>
  );
}
function sparkle(x: number, y: number, s = 4): ReactNode {
  return (
    <g>
      <circle cx={x} cy={y} r={s} fill={EYE} />
      <path
        d={`M${x} ${y - s * 1.15} L${x + s * 0.34} ${y - s * 0.22} L${x + s * 1.15} ${y} L${x + s * 0.34} ${y + s * 0.22} L${x} ${y + s * 1.15} L${x - s * 0.34} ${y + s * 0.22} L${x - s * 1.15} ${y} L${x - s * 0.34} ${y - s * 0.22} Z`}
        fill="#fff"
      />
    </g>
  );
}
function bead(x: number, y: number, s = 3): ReactNode {
  return (
    <g>
      <circle cx={x} cy={y} r={s} fill={EYE} />
      <circle cx={x - s * 0.3} cy={y - s * 0.3} r={s * 0.36} fill="#fff" />
    </g>
  );
}
function dot(x: number, y: number, s = 2.2): ReactNode {
  return <circle cx={x} cy={y} r={s} fill={EYE} />;
}
function sharp(x: number, y: number, ink: string, s = 4): ReactNode {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={s} ry={s * 0.92} fill={EYE} />
      <circle cx={x - s * 0.28} cy={y - s * 0.36} r={s * 0.34} fill="#fff" />
      <path
        d={`M${x - s - 1} ${y - s * 0.7} q${s} ${-s * 0.5} ${s * 2 + 2} 0`}
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}
function sleepy(x: number, y: number, ink: string, s = 5): ReactNode {
  return (
    <path
      d={`M${x - s} ${y - 1} q${s} ${s * 0.9} ${s * 2} 0`}
      fill="none"
      stroke={ink}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  );
}
function closed(x: number, y: number, ink: string, s = 5): ReactNode {
  return (
    <path
      d={`M${x - s} ${y + 1} q${s} ${-s} ${s * 2} 0`}
      fill="none"
      stroke={ink}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  );
}
function dizzy(x: number, y: number, ink: string, s = 4): ReactNode {
  return (
    <path
      d={`M${x} ${y} m${-s} 0 a${s} ${s} 0 1 1 ${s * 1.5} ${s * 0.7}`}
      fill="none"
      stroke={ink}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  );
}
function glow(x: number, y: number, s = 5): ReactNode {
  return (
    <g>
      <circle cx={x} cy={y} r={s} fill="#faf5ff" />
      <circle cx={x} cy={y} r={s * 0.58} fill="#8b5cf6" />
      <circle cx={x} cy={y} r={s * 0.24} fill={EYE} />
      <circle cx={x - s * 0.3} cy={y - s * 0.3} r={s * 0.18} fill="#fff" />
    </g>
  );
}
function gleam(x: number, y: number, s = 4.5): ReactNode {
  return <path d={`M${x - s} ${y} a${s} ${s} 0 0 0 ${s * 2} 0 z`} fill={EYE} />;
}

/* ---- shared bits --------------------------------------------------- */

function shadow(rx = 24): ReactNode {
  return <ellipse cx="50" cy="92" rx={rx} ry="4.5" fill="#00000018" />;
}
function blush(x: number, y: number, r = 3.4): ReactNode {
  return <circle cx={x} cy={y} r={r} fill="#ff8da6" opacity="0.5" />;
}
function smile(x: number, y: number, w: number, ink: string): ReactNode {
  return (
    <path
      d={`M${x - w} ${y} q${w} ${w} ${w * 2} 0`}
      fill="none"
      stroke={ink}
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  );
}

/* =================================================================== *
 * The roster. One entry per critter, drawn in its own pose.
 * =================================================================== */

const ART: Record<CreatureId, (p: P) => ReactNode> = {
  /* ---- Anchor / Stone -------------------------------------------- */

  // stocky rock pup, sitting square and proud
  boulderpup: ({ hue, ink }) => (
    <g>
      <g fill="#a8a29e" stroke={ink} strokeWidth="2.5">
        <ellipse cx="34" cy="82" rx="10" ry="8" />
        <ellipse cx="66" cy="82" rx="10" ry="8" />
      </g>
      <path d="M26 62 q0 -24 24 -24 q24 0 24 24 q0 18 -24 18 q-24 0 -24 -18 z" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="66" rx="14" ry="13" fill="#ffffffbb" />
      <g fill="#a8a29e" stroke={ink} strokeWidth="2.5">
        <ellipse cx="27" cy="70" rx="7" ry="9" />
        <ellipse cx="73" cy="70" rx="7" ry="9" />
      </g>
      <circle cx="50" cy="34" r="19" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M32 26 l-6 -12 l14 5 z" fill="#a8a29e" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M68 26 l6 -12 l-14 5 z" fill="#a8a29e" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M40 20 q10 -8 20 0" fill="none" stroke="#ffffff55" strokeWidth="4" strokeLinecap="round" />
      {bright(43, 34, 4.4)}
      {bright(57, 34, 4.4)}
      <ellipse cx="50" cy="41" rx="6" ry="4.5" fill="#fff" />
      <ellipse cx="50" cy="40" rx="2.2" ry="1.6" fill={ink} />
      <path d="M50 42 q0 4 -4 5 M50 42 q0 4 4 5" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="50" cy="47" rx="2.6" ry="2" fill="#ff8da6" />
      {blush(35, 40)}
      {blush(65, 40)}
    </g>
  ),

  // low mossy tortoise, lying down, sprig on the shell
  mossback: ({ hue, ink }) => (
    <g>
      <g fill="#3f6212" stroke={ink} strokeWidth="2.5">
        <ellipse cx="30" cy="76" rx="8" ry="6" />
        <ellipse cx="70" cy="76" rx="8" ry="6" />
      </g>
      <ellipse cx="24" cy="66" rx="12" ry="10" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M18 66 a34 26 0 0 1 68 0 q-34 12 -68 0 z" fill="#4d7c2f" stroke={ink} strokeWidth="3" />
      <path d="M22 62 a30 20 0 0 1 60 0" fill="#3f6212" opacity="0.5" />
      <g fill="#65a30d">
        <circle cx="40" cy="52" r="5" />
        <circle cx="54" cy="49" r="6" />
        <circle cx="66" cy="54" r="4.5" />
      </g>
      <path d="M55 44 q-2 -14 -12 -16 q3 12 12 16 z" fill="#4d7c2f" stroke={ink} strokeWidth="1.5" />
      <path d="M55 44 q2 -12 12 -14 q-3 10 -12 14 z" fill="#65a30d" stroke={ink} strokeWidth="1.5" />
      {sleepy(30, 66, ink, 4)}
      {sleepy(43, 66, ink, 4)}
      {smile(31, 71, 4, ink)}
      {blush(21, 70)}
      {blush(45, 70)}
    </g>
  ),

  // smooth stone spirit, almost asleep, floating with a Z
  slumberstone: ({ hue, ink }) => (
    <g>
      <path d="M26 56 a24 24 0 0 1 48 0 q0 22 -24 26 q-24 -4 -24 -26 z" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="40" cy="44" rx="12" ry="9" fill="#ffffff40" />
      <path d="M36 54 q-2 -6 -6 -8 M64 54 q2 -6 6 -8" fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      {closed(40, 58, ink, 4.5)}
      {closed(60, 58, ink, 4.5)}
      <path d="M45 68 q5 3 10 0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      {blush(37, 64)}
      {blush(63, 64)}
      <text x="70" y="34" fontSize="12" fontWeight="700" fill={ink} fontFamily="system-ui">z</text>
      <text x="78" y="24" fontSize="8" fontWeight="700" fill={ink} fontFamily="system-ui">z</text>
    </g>
  ),

  /* ---- Drift / Gust --------------------------------------------- */

  // plump songbird mid-hop, one wing up, head cocked
  breezefinch: ({ hue, ink }) => (
    <g>
      <g stroke={ink} strokeWidth="2.6" strokeLinecap="round">
        <path d="M44 82 l-2 8 M44 90 l-4 3 M44 90 l4 3" />
        <path d="M58 80 l3 8 M61 88 l-4 3 M61 88 l4 3" />
      </g>
      <path d="M30 58 q-10 6 -6 18 q9 1 13 -8 z" fill="#e0f2fe" stroke={ink} strokeWidth="2.4" />
      <ellipse cx="52" cy="56" rx="20" ry="22" fill={hue} stroke={ink} strokeWidth="3" transform="rotate(-8 52 56)" />
      <ellipse cx="52" cy="62" rx="11" ry="13" fill="#e0f2fe" />
      <path d="M70 52 q12 4 12 18 q-10 2 -14 -8 z" fill="#bae6fd" stroke={ink} strokeWidth="2.4" />
      <circle cx="48" cy="34" r="15" fill={hue} stroke={ink} strokeWidth="3" transform="rotate(-8 48 34)" />
      <g fill="#bae6fd" stroke={ink} strokeWidth="1.4">
        <path d="M46 20 l-3 -10 l4 4 l3 -4 z" />
        <path d="M40 22 l-4 -9 l5 3 z" />
      </g>
      <path d="M46 36 l-8 3 l8 4 z" fill="#f6b73c" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" />
      {bright(46, 30, 3.6)}
      {bright(56, 31, 3.6)}
      {blush(40, 37)}
      {blush(60, 38)}
    </g>
  ),

  // spherical fuzzball mid-roll, limbs splayed, dizzy
  tumbleweed: ({ hue, ink }) => (
    <g transform="rotate(18 50 56)">
      <g stroke={ink} strokeWidth="5" strokeLinecap="round">
        <path d="M30 44 l-12 -8 M72 40 l12 -4 M32 74 l-10 10 M70 74 l12 8" />
      </g>
      <circle cx="50" cy="56" r="26" fill={hue} stroke={ink} strokeWidth="3" />
      <g stroke="#a16207" strokeWidth="2" opacity="0.55" fill="none">
        <path d="M28 50 q22 -6 44 4 M26 62 q24 6 46 -4 M40 32 q6 24 0 48" />
      </g>
      {dizzy(42, 54, ink, 4)}
      {dizzy(60, 54, ink, 4)}
      <ellipse cx="51" cy="66" rx="4" ry="3" fill={ink} />
      {blush(38, 62)}
      {blush(64, 62)}
      <g stroke={ink} strokeWidth="2" strokeLinecap="round" opacity="0.4">
        <path d="M14 40 q-4 4 -2 8 M12 60 q-4 2 -3 8" />
      </g>
    </g>
  ),

  // sleek glider, membranes spread, leaning into a dive
  glidewing: ({ hue, ink }) => (
    <g>
      <g stroke={ink} strokeWidth="2.6" strokeLinecap="round">
        <path d="M46 78 l-2 8 M58 78 l2 8" />
      </g>
      <path d="M40 48 q-30 2 -32 26 q22 6 40 -10 z" fill="#a5f3fc" stroke={ink} strokeWidth="2.6" />
      <path d="M60 48 q30 2 32 26 q-22 6 -40 -10 z" fill="#a5f3fc" stroke={ink} strokeWidth="2.6" />
      <ellipse cx="50" cy="56" rx="17" ry="21" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="60" rx="9" ry="12" fill="#cffafe" />
      <circle cx="50" cy="32" r="15" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M38 24 q-6 -6 -3 -12 q7 3 8 11 z" fill={hue} stroke={ink} strokeWidth="2.2" />
      <path d="M62 24 q6 -6 3 -12 q-7 3 -8 11 z" fill={hue} stroke={ink} strokeWidth="2.2" />
      {sharp(43, 33, ink, 4)}
      {sharp(57, 33, ink, 4)}
      <path d="M46 41 q4 3 8 0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      {blush(36, 38)}
      {blush(64, 38)}
    </g>
  ),

  /* ---- Hush / Dream ------------------------------------------- */

  // mouse curled into a comma, huge ears, tail wrapped, one eye cracked
  snoozemouse: ({ hue, ink }) => (
    <g>
      <path d="M24 60 q-2 -22 22 -26 q26 -4 30 18 q4 20 -16 26 q-34 8 -36 -18 z" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M74 62 q16 2 16 -12 q0 -10 -9 -9 q-7 1 -4 8" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="34" cy="32" rx="12" ry="13" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="34" cy="32" rx="6" ry="7" fill="#f9a8d4" />
      <ellipse cx="58" cy="28" rx="11" ry="12" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="58" cy="28" rx="5.5" ry="6.5" fill="#f9a8d4" />
      <ellipse cx="42" cy="52" rx="14" ry="12" fill="#fce7f3" />
      {sleepy(37, 52, ink, 4)}
      {closed(52, 50, ink, 3.5)}
      <ellipse cx="30" cy="58" rx="2.6" ry="2" fill="#f472b6" />
      <path d="M33 60 q6 3 11 -1" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(34, 58)}
      <text x="64" y="40" fontSize="9" fontWeight="700" fill={ink} fontFamily="system-ui">z</text>
    </g>
  ),

  // fox-wisp dissolving into fog at the base, dreamy glowing eyes
  fogkit: ({ hue, ink }) => (
    <g>
      <g fill="#ede9fe" opacity="0.9">
        <circle cx="34" cy="78" r="9" />
        <circle cx="50" cy="82" r="10" />
        <circle cx="66" cy="78" r="9" />
        <circle cx="42" cy="72" r="7" />
        <circle cx="58" cy="72" r="7" />
      </g>
      <path d="M32 58 q-2 -20 18 -22 q20 2 18 22 q-2 14 -18 16 q-16 -2 -18 -16 z" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M78 56 q10 -2 12 -14 q-12 2 -14 10 z" fill="#c4b5fd" stroke={ink} strokeWidth="2.2" opacity="0.9" />
      <path d="M34 40 l-4 -14 l12 8 z" fill={hue} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M66 40 l4 -14 l-12 8 z" fill={hue} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      {glow(42, 46, 5)}
      {glow(58, 46, 5)}
      <path d="M46 56 q4 3 8 0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      {blush(35, 52)}
      {blush(65, 52)}
    </g>
  ),

  // fawn nodding off on its feet, head drooping, acorn pouch
  dozderling: ({ hue, ink }) => (
    <g>
      <g stroke={ink} strokeWidth="4" strokeLinecap="round">
        <path d="M40 74 l-2 14 M58 74 l2 14 M50 76 l6 10" />
      </g>
      <ellipse cx="50" cy="62" rx="18" ry="16" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="66" rx="10" ry="10" fill="#ddd6fe" />
      <g fill="#c4b5fd"><circle cx="40" cy="60" r="2.4" /><circle cx="58" cy="64" r="2.4" /><circle cx="50" cy="55" r="2.4" /></g>
      <path d="M66 58 q10 2 10 12 q-8 2 -12 -6 z" fill="#a78bfa" stroke={ink} strokeWidth="2.2" />
      <ellipse cx="40" cy="42" rx="12" ry="13" fill={hue} stroke={ink} strokeWidth="3" transform="rotate(14 40 42)" />
      <path d="M34 30 q-3 -10 -8 -12 M36 30 q0 -11 3 -14" fill="none" stroke="#a16207" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M39 17 q4 -4 9 -3 q-1 6 -8 6 z" fill="#65a30d" stroke={ink} strokeWidth="1.2" />
      <ellipse cx="30" cy="40" rx="5" ry="7" fill={hue} stroke={ink} strokeWidth="2.4" />
      {sleepy(35, 44, ink, 3.6)}
      {sleepy(45, 42, ink, 3.6)}
      <ellipse cx="34" cy="50" rx="2.4" ry="1.8" fill={ink} transform="rotate(14 34 50)" />
      {blush(44, 47)}
    </g>
  ),

  /* ---- Thrift / Sun ------------------------------------------ */

  // squirrel sitting up, clutching an acorn, giant tail curled behind
  nutsquirrel: ({ hue, ink }) => (
    <g>
      <path d="M70 82 q26 -4 22 -34 q-4 -22 -22 -20 q14 10 8 26 q-6 16 -16 20 z" fill="#c2853f" stroke={ink} strokeWidth="3" />
      <g fill="#c2853f" stroke={ink} strokeWidth="2.5">
        <ellipse cx="40" cy="84" rx="9" ry="6" />
        <ellipse cx="58" cy="84" rx="9" ry="6" />
      </g>
      <path d="M34 62 q0 -22 16 -22 q16 0 16 22 q0 16 -16 16 q-16 0 -16 -16 z" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="66" rx="10" ry="12" fill="#fde68a" />
      <circle cx="50" cy="34" r="15" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M38 24 l-3 -12 l10 6 z" fill={hue} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M62 24 l3 -12 l-10 6 z" fill={hue} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      <ellipse cx="50" cy="60" rx="9" ry="10" fill="#a16207" stroke={ink} strokeWidth="2.2" />
      <path d="M42 55 q8 -5 16 0" fill="none" stroke="#78350f" strokeWidth="2" />
      <ellipse cx="50" cy="49" rx="3" ry="4" fill="#78350f" stroke={ink} strokeWidth="1.4" />
      {sparkle(43, 33, 3.8)}
      {sparkle(57, 33, 3.8)}
      <path d="M47 41 q3 3 6 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(37, 38)}
      {blush(63, 38)}
    </g>
  ),

  // fat hamster, cheeks stuffed, sitting on a little hoard, sprout on head
  acorncache: ({ hue, ink }) => (
    <g>
      <ellipse cx="50" cy="82" rx="30" ry="8" fill="#d6a35c" stroke={ink} strokeWidth="2" />
      <g fill="#b45309"><circle cx="30" cy="80" r="4" /><circle cx="70" cy="80" r="4" /><circle cx="50" cy="84" r="4" /></g>
      <path d="M22 60 q0 -22 28 -22 q28 0 28 22 q0 20 -28 20 q-28 0 -28 -20 z" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="64" rx="16" ry="14" fill="#fde68a" />
      <ellipse cx="26" cy="56" rx="11" ry="12" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="74" cy="56" rx="11" ry="12" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M50 40 q-2 -10 2 -14 q6 4 4 14 z" fill="#65a30d" stroke={ink} strokeWidth="1.6" />
      {closed(38, 52, ink, 5)}
      {closed(62, 52, ink, 5)}
      <ellipse cx="50" cy="58" rx="3" ry="2.4" fill="#78350f" />
      <path d="M50 60 q-4 4 -8 2 M50 60 q4 4 8 2" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(34, 56, 4.5)}
      {blush(66, 56, 4.5)}
    </g>
  ),

  // domed beetle basking, one horn, six planted legs, sun mark on the back
  sunbeetle: ({ hue, ink }) => (
    <g>
      <g stroke={ink} strokeWidth="3" strokeLinecap="round">
        <path d="M34 60 l-14 -6 M34 68 l-16 2 M34 76 l-12 10 M66 60 l14 -6 M66 68 l16 2 M66 76 l12 10" />
      </g>
      <path d="M24 72 a26 30 0 0 1 52 0 z" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M50 44 v34" stroke={ink} strokeWidth="2" />
      <g stroke="#b45309" strokeWidth="2.4" opacity="0.7" fill="none">
        <circle cx="50" cy="64" r="7" />
        <path d="M50 52 v-5 M50 76 v5 M38 64 h-5 M62 64 h5" />
      </g>
      <ellipse cx="50" cy="42" rx="13" ry="11" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M50 33 l-5 -14 l10 0 z" fill="#b45309" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      {bead(45, 42, 3)}
      {bead(55, 42, 3)}
      <path d="M46 48 q4 3 8 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(40, 45)}
      {blush(60, 45)}
    </g>
  ),

  // little bookkeeper, striped tail, one paw raised counting, tongue out
  tallykit: ({ hue, ink }) => (
    <g>
      <path d="M68 82 q20 0 20 -18 q0 -12 -10 -12 q10 8 4 18 q-6 10 -14 12 z" fill={hue} stroke={ink} strokeWidth="3" />
      <g stroke="#7c2d12" strokeWidth="3" opacity="0.6"><path d="M74 56 q6 4 6 12 M80 58 q4 4 3 10" /></g>
      <g fill={hue} stroke={ink} strokeWidth="2.5">
        <ellipse cx="42" cy="84" rx="8" ry="6" />
        <ellipse cx="58" cy="84" rx="8" ry="6" />
      </g>
      <path d="M34 64 q0 -20 16 -20 q16 0 16 20 q0 14 -16 14 q-16 0 -16 -14 z" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="66" rx="10" ry="11" fill="#ffedd5" />
      <path d="M34 60 q-8 -6 -8 -16" fill="none" stroke={hue} strokeWidth="6" strokeLinecap="round" />
      <path d="M34 60 q-8 -6 -8 -16" fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round" opacity="0.25" />
      <circle cx="26" cy="43" r="3.5" fill="#fdba74" stroke={ink} strokeWidth="1.6" />
      <circle cx="50" cy="34" r="14" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M39 25 l-2 -10 l8 5 z" fill={hue} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M61 25 l2 -10 l-8 5 z" fill={hue} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M40 32 h-9 M60 32 h9" stroke="#7c2d12" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      {sharp(44, 34, ink, 3.4)}
      {sharp(56, 34, ink, 3.4)}
      <ellipse cx="52" cy="42" rx="2.4" ry="3" fill="#f472b6" />
      {blush(38, 39)}
      {blush(62, 39)}
    </g>
  ),

  /* ---- Ward / Shell ----------------------------------------- */

  // hedgehog half-curled, quills fanned up, soft face peeking, content
  pricklehog: ({ hue, ink }) => (
    <g>
      <path d="M18 70 q4 -40 40 -40 q30 0 34 30 q-10 -8 -18 -2 q-6 -10 -16 -6 q-6 -10 -16 -4 q-6 -8 -14 -2 q-4 -6 -10 -2 q0 16 6 28 z" fill="#fecdd3" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M22 66 q6 -30 34 -30 q24 0 30 22" fill="none" stroke={ink} strokeWidth="1.6" opacity="0.4" />
      <path d="M20 66 q0 18 22 20 q24 2 30 -14 q4 -18 -14 -24 q-22 -6 -38 18 z" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="34" cy="72" rx="3" ry="2.4" fill={ink} />
      {closed(38, 62, ink, 4.5)}
      {closed(54, 60, ink, 4.5)}
      <path d="M40 70 q6 3 11 -1" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(40, 68)}
      {blush(58, 65)}
    </g>
  ),

  // shy shell-dweller peeking over the rim of a spiral pearl shell
  shellclam: ({ hue, ink }) => (
    <g>
      <path d="M14 74 q0 -34 36 -34 q36 0 36 34 z" fill="#fbcfe8" stroke={ink} strokeWidth="3" />
      <path d="M50 74 q-2 -26 -18 -30 M50 74 q4 -22 22 -26 M22 66 q28 -6 56 0" fill="none" stroke={ink} strokeWidth="1.8" opacity="0.45" />
      <circle cx="66" cy="66" r="6" fill="#fff" opacity="0.7" />
      <path d="M26 60 q6 -18 24 -18 q18 0 24 18 q-24 8 -48 0 z" fill={hue} stroke={ink} strokeWidth="3" />
      {wide(42, 52, 4.6)}
      {wide(58, 52, 4.6)}
      <path d="M46 58 q4 2 8 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(36, 55)}
      {blush(64, 55)}
    </g>
  ),

  // salamander on all fours mid-stride, bark back, a shoot on the tail
  barknewt: ({ hue, ink }) => (
    <g>
      <path d="M74 60 q16 0 18 -14 q1 -9 -7 -9 q-6 0 -5 7" fill="none" stroke={hue} strokeWidth="9" strokeLinecap="round" />
      <path d="M86 40 q3 -8 10 -9 q-1 8 -8 10 z" fill="#65a30d" stroke={ink} strokeWidth="1.4" />
      <g fill="#4d7c2f" stroke={ink} strokeWidth="2.4">
        <ellipse cx="32" cy="70" rx="6" ry="8" transform="rotate(22 32 70)" />
        <ellipse cx="60" cy="70" rx="6" ry="8" transform="rotate(-22 60 70)" />
        <ellipse cx="42" cy="74" rx="5" ry="6" />
        <ellipse cx="52" cy="74" rx="5" ry="6" />
      </g>
      <ellipse cx="46" cy="56" rx="27" ry="14" fill={hue} stroke={ink} strokeWidth="3" />
      <g fill="#4d7c2f" opacity="0.6"><path d="M34 44 l-3 -6 l6 1 z" /><path d="M46 42 l-3 -7 l6 1 z" /><path d="M58 44 l-3 -6 l6 1 z" /></g>
      <path d="M28 50 q16 -8 34 0" fill="none" stroke="#ffffff50" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="22" cy="48" r="13" fill={hue} stroke={ink} strokeWidth="3" />
      {sharp(19, 46, ink, 3.6)}
      {sharp(30, 47, ink, 3.6)}
      <path d="M16 54 q6 3 12 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(15, 51)}
    </g>
  ),

  // seed-pod sentinel, arms crossed, thorns out, a bud ready to burst
  thornpod: ({ hue, ink }) => (
    <g>
      <g fill="#7f1d1d">
        <path d="M22 54 l-12 -4 l10 -5 z" />
        <path d="M20 66 l-13 3 l11 5 z" />
        <path d="M78 54 l12 -4 l-10 -5 z" />
        <path d="M80 66 l13 3 l-11 5 z" />
        <path d="M30 34 l-6 -12 l11 4 z" />
        <path d="M70 34 l6 -12 l-11 4 z" />
      </g>
      <g fill={hue} stroke={ink} strokeWidth="2.5">
        <ellipse cx="40" cy="84" rx="9" ry="6" />
        <ellipse cx="60" cy="84" rx="9" ry="6" />
      </g>
      <path d="M28 58 q0 -30 22 -30 q22 0 22 30 q0 22 -22 22 q-22 0 -22 -22 z" fill={hue} stroke={ink} strokeWidth="3" />
      <path d="M32 62 q18 10 36 0" fill="none" stroke={ink} strokeWidth="2" opacity="0.4" />
      <path d="M30 60 q10 -8 20 0 q10 -8 20 0" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" />
      <path d="M50 30 q-4 -12 0 -18 q4 6 0 18 z" fill="#fb7185" stroke={ink} strokeWidth="2" />
      {sharp(42, 46, ink, 4)}
      {sharp(58, 46, ink, 4)}
      <path d="M40 40 l6 3 M60 40 l-6 3" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M45 56 h10" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      {blush(36, 52)}
      {blush(64, 52)}
    </g>
  ),

  // porcupine standing tall, quills flared like a starburst, bold grin
  quillhog: ({ hue, ink }) => (
    <g>
      <g fill="#fb7185" stroke={ink} strokeWidth="1.6" strokeLinejoin="round">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 300, 330].map((a) => {
          const rad = (a * Math.PI) / 180;
          const x1 = 50 + Math.cos(rad) * 20;
          const y1 = 58 + Math.sin(rad) * 20;
          const x2 = 50 + Math.cos(rad) * 40;
          const y2 = 58 + Math.sin(rad) * 40;
          const nx = Math.cos(rad + 1.4) * 6;
          const ny = Math.sin(rad + 1.4) * 6;
          return <path key={a} d={`M${x1 + nx} ${y1 + ny} L${x2} ${y2} L${x1 - nx} ${y1 - ny} Z`} />;
        })}
      </g>
      <g fill={hue} stroke={ink} strokeWidth="2.5">
        <ellipse cx="40" cy="86" rx="9" ry="6" />
        <ellipse cx="60" cy="86" rx="9" ry="6" />
      </g>
      <ellipse cx="50" cy="58" rx="22" ry="24" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="64" rx="12" ry="14" fill="#ffe4e6" />
      {wide(43, 52, 5)}
      {wide(57, 52, 5)}
      <path d="M39 45 q4 -3 8 -1 M61 45 q-4 -3 -8 -1" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M42 62 q8 8 16 0 z" fill="#fff" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      {blush(36, 58)}
      {blush(64, 58)}
    </g>
  ),

  /* ---- Snap / Spark ---------------------------------------- */

  // hummingbird darting, blurred wings, body tilted, eager
  swiftwren: ({ hue, ink }) => (
    <g>
      <g stroke={ink} strokeWidth="2" opacity="0.35" fill="none">
        <path d="M20 44 q10 -4 20 0 M18 54 q12 -2 22 2" />
      </g>
      <path d="M26 42 q-16 2 -18 14 q14 6 24 -4 z" fill="#fed7aa" stroke={ink} strokeWidth="2.2" opacity="0.9" />
      <path d="M30 56 q-14 8 -12 20 q14 0 22 -12 z" fill="#fdba74" stroke={ink} strokeWidth="2.2" opacity="0.9" />
      <ellipse cx="52" cy="54" rx="16" ry="19" fill={hue} stroke={ink} strokeWidth="3" transform="rotate(12 52 54)" />
      <ellipse cx="52" cy="60" rx="8" ry="11" fill="#ffedd5" />
      <path d="M64 70 l14 8 l-10 2 z" fill="#fdba74" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="52" cy="32" r="14" fill={hue} stroke={ink} strokeWidth="3" transform="rotate(12 52 32)" />
      <path d="M52 33 l14 -3 l-13 7 z" fill="#f6b73c" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M48 19 l-3 -9 l5 4 l3 -4 z" fill="#fde047" stroke={ink} strokeWidth="1.2" />
      {bright(50, 30, 4)}
      {bright(60, 32, 3.6)}
      {blush(44, 37)}
      {blush(62, 39)}
    </g>
  ),

  // mole erupting from a dirt mound, big claws forward, tiny eyes
  digmole: ({ hue, ink }) => (
    <g>
      <path d="M8 84 q18 -14 42 -14 q24 0 42 14 z" fill="#a16207" stroke={ink} strokeWidth="2.5" />
      <g fill="#78350f"><circle cx="20" cy="72" r="3" /><circle cx="80" cy="72" r="3" /><circle cx="66" cy="66" r="2.5" /></g>
      <path d="M30 64 q0 -26 20 -26 q20 0 20 26 q0 10 -20 10 q-20 0 -20 -10 z" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="58" rx="11" ry="10" fill="#fbcfe8" />
      <g fill="#fbcfe8" stroke={ink} strokeWidth="2.4">
        <path d="M28 58 q-14 2 -18 12 q6 4 12 0 q-2 -6 6 -6 z" />
        <path d="M72 58 q14 2 18 12 q-6 4 -12 0 q2 -6 -6 -6 z" />
      </g>
      <g stroke={ink} strokeWidth="1.8"><path d="M12 66 l-4 2 M12 70 l-4 1 M88 66 l4 2 M88 70 l4 1" /></g>
      {dot(43, 42, 2.4)}
      {dot(57, 42, 2.4)}
      <ellipse cx="50" cy="48" rx="4" ry="3" fill="#f472b6" stroke={ink} strokeWidth="1.6" />
      <path d="M46 52 q4 3 8 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
      {blush(37, 46)}
      {blush(63, 46)}
    </g>
  ),

  // lark launching upward, head thrown back singing, wings sweeping up
  wildlark: ({ hue, ink }) => (
    <g>
      <g stroke={ink} strokeWidth="2.4" strokeLinecap="round">
        <path d="M46 80 l-3 9 M56 80 l3 9" />
      </g>
      <path d="M36 52 q-18 -14 -18 -30 q18 6 26 24 z" fill="#fed7aa" stroke={ink} strokeWidth="2.4" />
      <path d="M64 52 q18 -14 18 -30 q-18 6 -26 24 z" fill="#fed7aa" stroke={ink} strokeWidth="2.4" />
      <ellipse cx="50" cy="58" rx="16" ry="20" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="62" rx="9" ry="12" fill="#ffedd5" />
      <circle cx="52" cy="34" r="13" fill={hue} stroke={ink} strokeWidth="3" transform="rotate(-16 52 34)" />
      <g stroke={ink} strokeWidth="1.6" fill="#fdba74"><path d="M50 22 l-3 -12 l4 4 l3 -5 z" /><path d="M44 24 l-4 -10 l5 3 z" /></g>
      <path d="M44 34 l-11 -4 l10 8 z" fill="#f6b73c" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      {closed(48, 32, ink, 3.6)}
      {closed(58, 34, ink, 3.6)}
      <ellipse cx="40" cy="35" rx="3" ry="4" fill="#241826" transform="rotate(-16 40 35)" opacity="0.9" />
      <text x="68" y="26" fontSize="11" fontWeight="700" fill={ink} fontFamily="system-ui">♪</text>
      {blush(46, 40)}
    </g>
  ),

  // round cat-spark mid-bounce, lit fuse on the head, mischief
  bombkit: ({ hue, ink }) => (
    <g transform="rotate(-8 50 56)">
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <path d="M18 40 l-6 -4 M22 30 l-3 -7 M82 40 l6 -4 M78 30 l3 -7" />
      </g>
      <g fill={hue} stroke={ink} strokeWidth="2.5">
        <ellipse cx="38" cy="84" rx="8" ry="6" />
        <ellipse cx="62" cy="84" rx="8" ry="6" />
      </g>
      <circle cx="50" cy="58" r="25" fill={hue} stroke={ink} strokeWidth="3" />
      <ellipse cx="50" cy="64" rx="13" ry="14" fill="#ffe4c4" />
      <path d="M34 40 l-4 -12 l12 6 z" fill={hue} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M66 40 l4 -12 l-12 6 z" fill={hue} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M50 34 q3 -8 -1 -12" fill="none" stroke="#7c2d12" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48 22 l-3 -4 l5 -1 l-1 -5 l4 4 l4 -3 l-1 6 l5 1 l-5 3 z" fill="#fde047" stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
      {gleam(43, 54, 4.6)}
      {gleam(57, 54, 4.6)}
      <path d="M40 47 l6 2 M60 47 l-6 2" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M43 64 q7 6 14 0 q-7 -2 -14 0 z" fill="#7c2d12" />
      {blush(35, 60)}
      {blush(65, 60)}
    </g>
  ),
};

export function Critter({ id, size = 44 }: { id: CreatureId; size?: number }) {
  const cat = ROSTER[id].category;
  const p: P = { hue: CATEGORIES[cat].hue, ink: INK[cat] };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={ROSTER[id].name}
    >
      {shadow()}
      {ART[id](p)}
    </svg>
  );
}
