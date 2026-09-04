import { CATEGORIES, ROSTER, type CreatureId, creaturesByCategory } from "../engine";
import { tungStyle } from "./tung";

/* A "tung tung tung sahur": a stubby wooden-bat body, twig limbs, a big goofy
 * face, always a bit wrong in the proportions. One base model, varied per
 * critter by tungStyle() - prop underfoot, hat, held object, eyes, lean,
 * stretch - so the roster reads as a family but no two are posed alike. The
 * critter's type still tints its scarf so you can tell them apart. */

const WOOD = "#a9743f";
const WOOD_D = "#7c4f28";
const WOOD_L = "#d8b483";
const INK = "#241b2e";

function Eyes({ kind }: { kind: string }) {
  // drawn around (60, 44), each eye ~ r 10
  const white = (cx: number, cy: number, r = 11) => (
    <ellipse cx={cx} cy={cy} rx={r} ry={r * 1.15} fill="#fff" stroke={INK} strokeWidth="2.4" />
  );
  const pupil = (cx: number, cy: number, r = 4.4) => <circle cx={cx} cy={cy} r={r} fill={INK} />;
  if (kind === "cross")
    return (
      <g>
        {white(46, 44)}
        {white(74, 44)}
        <path d="M40 39l12 10M52 39l-12 10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M68 39l12 10M80 39l-12 10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  if (kind === "spiral")
    return (
      <g>
        {white(46, 44)}
        {white(74, 44)}
        <path d="M46 44a4 4 0 1 1-3-4 6 6 0 1 1 5 7" fill="none" stroke={INK} strokeWidth="2.6" />
        <path d="M74 44a4 4 0 1 1-3-4 6 6 0 1 1 5 7" fill="none" stroke={INK} strokeWidth="2.6" />
      </g>
    );
  if (kind === "sleepy")
    return (
      <g>
        {white(46, 45, 10)}
        {white(74, 45, 10)}
        <path d="M37 44q9 7 18 0M65 44q9 7 18 0" fill="#c99b6d" stroke="none" />
        <path d="M37 45q9 7 18 0M65 45q9 7 18 0" fill="none" stroke={INK} strokeWidth="2.6" />
        {pupil(46, 48, 3)}
        {pupil(74, 48, 3)}
      </g>
    );
  if (kind === "dots")
    return (
      <g>
        <circle cx={47} cy={45} r="4.5" fill={INK} />
        <circle cx={73} cy={45} r="4.5" fill={INK} />
      </g>
    );
  if (kind === "wide")
    return (
      <g>
        {white(45, 43, 14)}
        {white(75, 43, 14)}
        {pupil(45, 45, 5.5)}
        {pupil(75, 45, 5.5)}
        <circle cx={42} cy={41} r="2.6" fill="#fff" />
        <circle cx={72} cy={41} r="2.6" fill="#fff" />
      </g>
    );
  // goofy: two eyes looking different ways, different sizes
  return (
    <g>
      {white(45, 44, 12)}
      {white(76, 42, 9)}
      {pupil(49, 47, 4.6)}
      {pupil(73, 39, 3.6)}
      <circle cx={42} cy={41} r="2.4" fill="#fff" />
    </g>
  );
}

function Hat({ kind, hue }: { kind: string; hue: string }) {
  // top of head around y = 20, x = 60
  if (kind === "none") return null;
  if (kind === "cap")
    return (
      <g>
        <path d="M42 24q18 -16 36 0z" fill={hue} stroke={INK} strokeWidth="2.6" />
        <path d="M74 24q14 1 18 6q-10 3 -18 0z" fill={hue} stroke={INK} strokeWidth="2.6" />
      </g>
    );
  if (kind === "cone")
    return (
      <g>
        <path d="M60 -4l14 30h-28z" fill={hue} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx={60} cy={-4} r="4" fill="#fff" stroke={INK} strokeWidth="2" />
        <path d="M50 16h20M53 8h14" stroke="#fff" strokeWidth="2.4" />
      </g>
    );
  if (kind === "leaf")
    return (
      <path
        d="M60 24C50 24 44 10 48 -2C58 2 66 12 60 24Z"
        fill="#4caf50"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    );
  if (kind === "crown")
    return (
      <path
        d="M42 24l4 -16l8 8l6 -12l6 12l8 -8l4 16z"
        fill="#ffd23f"
        stroke={INK}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    );
  if (kind === "bucket")
    return (
      <g>
        <path d="M42 8h36l-4 18h-28z" fill="#bcbec2" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <rect x={40} y={4} width={40} height={6} rx={3} fill="#d7d9dd" stroke={INK} strokeWidth="2.4" />
      </g>
    );
  if (kind === "halo")
    return <ellipse cx={60} cy={6} rx={20} ry={6} fill="none" stroke="#ffe38a" strokeWidth="5" />;
  // band
  return (
    <g>
      <path d="M40 26q20 -10 40 0" fill="none" stroke={hue} strokeWidth="7" strokeLinecap="round" />
      <circle cx={40} cy={26} r="4" fill={hue} stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Hold({ kind }: { kind: string }) {
  // right hand around (96, 92)
  if (kind === "none") return null;
  if (kind === "bat")
    return (
      <g transform="translate(96 92) rotate(28)">
        <path d="M0 0q4 -30 3 -40q-3 -3 -6 0q-1 10 3 40z" fill={WOOD} stroke={INK} strokeWidth="2.6" />
        <rect x={-4} y={-2} width={8} height={8} rx={2} fill={WOOD_D} stroke={INK} strokeWidth="2" />
      </g>
    );
  if (kind === "stick")
    return <path d="M96 92l14 -22" stroke={WOOD_D} strokeWidth="4.5" strokeLinecap="round" />;
  if (kind === "flag")
    return (
      <g transform="translate(96 92)">
        <path d="M0 4l0 -34" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M0 -30l18 6l-18 8z" fill="#f43f5e" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      </g>
    );
  if (kind === "spoon")
    return (
      <g transform="translate(96 92) rotate(20)">
        <path d="M0 0l0 -26" stroke="#c9cdd3" strokeWidth="3.4" strokeLinecap="round" />
        <ellipse cx={0} cy={-30} rx={6} ry={8} fill="#e6e9ee" stroke={INK} strokeWidth="2.2" />
      </g>
    );
  // phone
  return (
    <g transform="translate(96 88) rotate(-8)">
      <rect x={-7} y={-13} width={14} height={26} rx={3} fill="#2b2233" stroke={INK} strokeWidth="2" />
      <rect x={-5} y={-10} width={10} height={18} rx={1} fill="#7fd4ff" />
    </g>
  );
}

function Prop({ kind }: { kind: string }) {
  // sits under the feet, centred ~ (60, 128)
  if (kind === "none")
    return <ellipse cx={60} cy={126} rx={26} ry={5} fill="#00000018" />;
  if (kind === "cloud")
    return (
      <g>
        <path
          d="M28 124q-10 0 -10 -9q0 -8 9 -8q1 -10 13 -10q7 0 11 6q4 -3 9 -3q10 0 11 10q9 0 9 8q0 6 -8 6z"
          fill="#fff"
          stroke={INK}
          strokeWidth="2.4"
        />
      </g>
    );
  if (kind === "rock")
    return (
      <path
        d="M26 128q-6 -14 10 -16q6 -8 18 -4q14 -3 20 8q10 2 6 12z"
        fill="#b8bcc4"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    );
  if (kind === "pad")
    return (
      <g>
        <ellipse cx={60} cy={126} rx={30} ry={9} fill="#5fbf5a" stroke={INK} strokeWidth="2.4" />
        <path d="M60 126l10 -6" stroke="#2f7a2c" strokeWidth="2.2" />
      </g>
    );
  if (kind === "stump")
    return (
      <g>
        <ellipse cx={60} cy={124} rx={22} ry={7} fill={WOOD_L} stroke={INK} strokeWidth="2.4" />
        <rect x={38} y={124} width={44} height={10} rx={3} fill={WOOD} stroke={INK} strokeWidth="2.4" />
      </g>
    );
  // puddle
  return (
    <ellipse
      cx={60}
      cy={126}
      rx={30}
      ry={8}
      fill="#8fd4e8"
      stroke={INK}
      strokeWidth="2.2"
    />
  );
}

export function Tung({
  id,
  size = 44,
}: {
  id: CreatureId;
  size?: number;
}) {
  const s = tungStyle(id);
  const cat = ROSTER[id].category;
  const hue = CATEGORIES[cat].hue;
  const sib = creaturesByCategory(cat).findIndex((c) => c.id === id);
  const woodTint = sib % 3 === 1 ? "#b9884f" : sib % 3 === 2 ? "#9a6636" : WOOD;

  return (
    <svg width={size} height={size} viewBox="0 -12 120 150" role="img" aria-label={id}>
      <Prop kind={s.prop} />
      <g
        transform={`translate(60 ${72 + s.bob}) rotate(${s.lean}) scale(1 ${s.stretch}) translate(-60 -72)`}
      >
        {/* legs */}
        <path d="M50 118l-6 14M70 118l6 14" stroke={WOOD_D} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx={42} cy={133} rx={7} ry={4} fill={WOOD_D} />
        <ellipse cx={78} cy={133} rx={7} ry={4} fill={WOOD_D} />
        {/* arms */}
        <path d="M34 84q-10 4 -12 14M86 84q10 4 12 14" stroke={WOOD_D} strokeWidth="5" strokeLinecap="round" />
        <circle cx={22} cy={99} r="4.5" fill={WOOD_D} />
        <circle cx={98} cy={99} r="4.5" fill={WOOD_D} />
        {/* body: a fat wooden bat */}
        <path
          d="M42 26C40 12 52 4 60 4s20 8 18 22c-2 12 4 40 4 62c0 20-10 30-22 30S38 110 38 90c0-22 6-50 4-64Z"
          fill={woodTint}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* wood grain */}
        <path d="M52 40q8 4 16 0M50 62q10 5 20 0M52 86q8 4 16 0" fill="none" stroke={WOOD_D} strokeWidth="2" opacity="0.6" />
        {/* type scarf */}
        <path d="M40 74q20 10 40 0l-2 9q-18 8 -36 0z" fill={hue} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        {/* face */}
        <Eyes kind={s.eyes} />
        <ellipse cx={60} cy={60} rx={5.5} ry={7} fill={INK} />
        <ellipse cx={60} cy={58} rx={2.6} ry={3} fill="#7a3247" />
        <circle cx={46} cy={56} r="3.5" fill="#ff9db6" opacity="0.55" />
        <circle cx={76} cy={56} r="3.5" fill="#ff9db6" opacity="0.55" />
        <Hat kind={s.hat} hue={hue} />
        <Hold kind={s.hold} />
      </g>
    </svg>
  );
}
