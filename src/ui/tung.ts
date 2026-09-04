import { ROSTER, type CreatureId } from "../engine";

/* TUNGIFY: a pure cosmetic reskin. When on, every critter becomes a "tung
 * tung tung sahur" - the same base model but funny-proportioned, on a
 * different prop, in a different pose - and gets a tung name. Nothing here
 * touches gameplay.
 *
 * Adding a critter later needs nothing here: `tungName` falls back to a
 * generated "Tung ... Sahur" and `tungStyle` derives a deterministic variant
 * from the critter's own archetype, so the roster and the animation both
 * scale automatically. The map below is just hand-tuned names for the ones
 * that shipped. */

const NAMES: Partial<Record<CreatureId, string>> = {
  boulderpup: "Tung Boulder Sahur",
  mossback: "Tung Mossy Turtlung",
  slumberstone: "Tung Sleepy Rocksahur",
  mudpaw: "Tung Mud Sahur",
  slatetusk: "Tung Slate Tuskung",
  lichenox: "Tung Lichen Sahur",
  breezefinch: "Tung Breezy Birdung",
  tumbleweed: "Tung Rolling Sahur",
  glidewing: "Tung Gliding Sahur",
  driftmink: "Tung Drift Minkung",
  galepup: "Tung Gale Sahur",
  dandypuff: "Tung Fluffy Sahur",
  snoozemouse: "Tung Snoozy Mousung",
  fogkit: "Tung Foggy Sahur",
  dozderling: "Tung Dozy Sahur",
  drowsivole: "Tung Drowsy Volung",
  lullabird: "Tung Lullah Birdung",
  dreamnewt: "Tung Dream Salamandung",
  nutsquirrel: "Tung Nutty Squirrelung",
  acorncache: "Tung Hoarder Sahur",
  sunbeetle: "Tung Sunny Beetlung",
  tallykit: "Tung Tally Sahur",
  sunmoth: "Tung Basking Mothung",
  emberfinch: "Tung Ember Birdung",
  pricklehog: "Tung Prickly Hogung",
  shellclam: "Tung Dawn Clamung",
  barknewt: "Tung Barky Salamandung",
  thornpod: "Tung Thorny Sahur",
  quillhog: "Tung Bristle Hogung",
  barkmole: "Tung Bunker Molung",
  swiftwren: "Tung Swift Wrenung",
  digmole: "Tung Digger Molung",
  wildlark: "Tung Rising Larkung",
  bombkit: "Tung Fizzy Sahur",
  joltjay: "Tung Jolty Jayung",
  sparkpaw: "Tung Static Sahur",
};

export function tungName(id: CreatureId): string {
  if (NAMES[id]) return NAMES[id] as string;
  // generated fallback for critters added later
  const base = ROSTER[id]?.name ?? id;
  return `Tung ${base}sahur`;
}

/* per-critter visual variant. Deterministic from the id so it's stable, and
 * spread across the option lists so no two critters land the same. */

export type TungProp = "none" | "cloud" | "rock" | "pad" | "stump" | "puddle";
export type TungHat =
  | "none"
  | "cap"
  | "cone"
  | "leaf"
  | "crown"
  | "bucket"
  | "halo"
  | "band";
export type TungHold = "none" | "bat" | "stick" | "flag" | "spoon" | "phone";
export type TungEyes = "goofy" | "wide" | "cross" | "sleepy" | "spiral" | "dots";

export interface TungStyle {
  prop: TungProp;
  hat: TungHat;
  hold: TungHold;
  eyes: TungEyes;
  /** body lean, degrees */
  lean: number;
  /** how stretched the body is, 0.8 - 1.5 */
  stretch: number;
  /** small hop offset so the parade / grid isn't a straight line */
  bob: number;
}

const PROPS: TungProp[] = ["none", "cloud", "rock", "pad", "stump", "puddle"];
const HATS: TungHat[] = [
  "none",
  "cap",
  "cone",
  "leaf",
  "crown",
  "bucket",
  "halo",
  "band",
];
const HOLDS: TungHold[] = ["none", "bat", "stick", "flag", "spoon", "phone"];
const EYES: TungEyes[] = ["goofy", "wide", "cross", "sleepy", "spiral", "dots"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function tungStyle(id: CreatureId): TungStyle {
  const h = hash(id);
  const a = (h >> 2) & 255;
  const b = (h >> 9) & 255;
  const c = (h >> 15) & 255;
  const d = (h >> 21) & 255;
  return {
    prop: PROPS[h % PROPS.length],
    hat: HATS[a % HATS.length],
    hold: HOLDS[b % HOLDS.length],
    eyes: EYES[c % EYES.length],
    lean: ((d % 13) - 6) * 2, // -12..12 deg
    stretch: 0.82 + ((h >> 4) % 60) / 90, // 0.82..1.48
    bob: ((h >> 6) % 9) - 4, // -4..4 px
  };
}

export const TUNG_WORDMARK = "TUNG³DOKU";
