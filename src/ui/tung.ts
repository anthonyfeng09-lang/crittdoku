import { ROSTER, type CreatureId } from "../engine";

/* TUNGIFY: a pure cosmetic reskin. When on, every critter becomes a "tung
 * tung tung sahur" - a stubby wooden-bat body - and gets a tung name.
 * Nothing here touches gameplay.
 *
 * Every critter's tung is a different silhouette (body shape, arm pose, leg
 * pose, mouth, head tilt, skew, scale) as well as different props/hat/held
 * item, all derived deterministically from the critter id, so no two read
 * the same. Adding a critter later needs nothing here: `tungName` falls back
 * to a generated "Tung ...sahur" and `tungStyle` derives from the id. */

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
  const base = ROSTER[id]?.name ?? id;
  return `Tung ${base}sahur`;
}

/* ---- per-critter visual variant ---- */

export type TungBody = "fat" | "tall" | "lumpy" | "crook" | "peanut" | "chonk";
export type TungArms = "down" | "up" | "wave" | "cross" | "out" | "hips";
export type TungLegs = "stand" | "step" | "sit" | "hop" | "wide" | "tip";
export type TungMouth = "o" | "grin" | "flat" | "wobble" | "tiny" | "gape";
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
  body: TungBody;
  arms: TungArms;
  legs: TungLegs;
  mouth: TungMouth;
  prop: TungProp;
  hat: TungHat;
  hold: TungHold;
  eyes: TungEyes;
  /** whole-body lean, degrees */
  lean: number;
  /** head tilt on top of the lean, degrees */
  headTilt: number;
  /** horizontal skew, degrees */
  skew: number;
  /** overall size multiplier */
  scale: number;
  /** vertical hop offset so a row of tungs isn't a straight line */
  bob: number;
  /** flip horizontally */
  flip: boolean;
}

const BODIES: TungBody[] = ["fat", "tall", "lumpy", "crook", "peanut", "chonk"];
const ARMS: TungArms[] = ["down", "up", "wave", "cross", "out", "hips"];
const LEGS: TungLegs[] = ["stand", "step", "sit", "hop", "wide", "tip"];
const MOUTHS: TungMouth[] = ["o", "grin", "flat", "wobble", "tiny", "gape"];
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
  const bit = (shift: number, m: number) => ((h >>> shift) % m);
  return {
    body: BODIES[bit(1, BODIES.length)],
    arms: ARMS[bit(4, ARMS.length)],
    legs: LEGS[bit(7, LEGS.length)],
    mouth: MOUTHS[bit(10, MOUTHS.length)],
    prop: PROPS[bit(13, PROPS.length)],
    hat: HATS[bit(16, HATS.length)],
    hold: HOLDS[bit(19, HOLDS.length)],
    eyes: EYES[bit(22, EYES.length)],
    lean: bit(25, 13) - 6, // -6..6 deg
    headTilt: bit(3, 17) - 8, // -8..8
    skew: bit(6, 11) - 5, // -5..5
    scale: 0.86 + bit(9, 24) / 90, // 0.86..1.12
    bob: bit(12, 11) - 5, // -5..5 px
    flip: bit(15, 2) === 1,
  };
}

export const TUNG_WORDMARK = "TUNG³DOKU";
