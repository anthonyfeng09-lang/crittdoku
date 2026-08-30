import { RNG } from "./rng";
import { CreatureId, Loadout } from "./types";

export type { CreatureId };

/* ------------------------------------------------------------------ *
 * The roster. Every critter is a set of declarative capabilities the
 * engine reads, so game state stays cloneable and the rules stay in one
 * place. Add new critters by appending to ROSTER (keep the CreatureId
 * union in sync). Each belongs to a CATEGORY; the draft is built around
 * picking across categories.
 * ------------------------------------------------------------------ */

export type Category = "anchor" | "drift" | "hush" | "thrift" | "ward" | "snap";

export interface CategoryDef {
  id: Category;
  /** the mechanical family name */
  name: string;
  /** the friendly "type" name shown as a badge */
  element: string;
  tagline: string;
  hue: string;
}

export const CATEGORIES: Record<Category, CategoryDef> = {
  anchor: { id: "anchor", name: "Anchor", element: "Stone", tagline: "hold the ground", hue: "#5aa469" },
  drift: { id: "drift", name: "Drift", element: "Gust", tagline: "move after you land", hue: "#3fa3a3" },
  hush: { id: "hush", name: "Hush", element: "Dream", tagline: "play with timing", hue: "#8f7fd4" },
  thrift: { id: "thrift", name: "Thrift", element: "Sun", tagline: "gather energy", hue: "#e0a83d" },
  ward: { id: "ward", name: "Ward", element: "Shell", tagline: "protect what you hold", hue: "#e2857b" },
  snap: { id: "snap", name: "Snap", element: "Spark", tagline: "disrupt the board", hue: "#e2915b" },
};

export interface CreatureDef {
  id: CreatureId;
  name: string;
  epithet: string;
  category: Category;
  blurb: string;

  permanent?: boolean;
  /** may be moved to a nearby empty legal cell as an action */
  moveAdjacent?: boolean;
  /** hop budget this critter contributes to the team (default 0) */
  hops?: number;
  /** hops may also travel diagonally */
  moveDiagonal?: boolean;
  /** on placement, does not count toward completion/territory until it wakes */
  dormant?: boolean;
  /** how many of the owner's turns it stays asleep (default 1) */
  dormantTurns?: number;
  /** energy granted on placement, on top of the base */
  energyBonus?: number;
  /** +3 energy whenever the opponent locks a region holding an active one */
  energyOnOpponentLock?: boolean;
  /** the opponent cannot LOCK a region by completing it while you hold an
   *  active cell here (it goes to majority instead) */
  denyOpponentLock?: boolean;
  /** once a match, place onto an opponent's non-permanent digit in a
   *  contested region to remove it */
  replaceOncePerGame?: boolean;
  /** a Mole can't take it; any other removal only delays it a turn */
  regrowIfRemoved?: boolean;
  /** once a match, placing it grants an immediate extra placement and
   *  forfeits the owner's next turn */
  extraPlacementOncePerGame?: boolean;
  /** at the freeze, a tied region where you hold an active cell breaks to you */
  breakTiesToOwner?: boolean;
  /** weight per cell toward territory majority (default 1) */
  territoryWeight?: number;
  /** once a match, one placement ignores row/col/box (can't complete a region) */
  wildOncePerGame?: boolean;
}

export const ROSTER: Record<CreatureId, CreatureDef> = {
  // ---- Anchor -----------------------------------------------------
  boulderpup: {
    id: "boulderpup",
    name: "Boulderpup",
    epithet: "Steadfast",
    category: "anchor",
    blurb: "Its cells are permanent. Nothing can move or remove them.",
    permanent: true,
  },
  mossback: {
    id: "mossback",
    name: "Mossback",
    epithet: "Old growth",
    category: "anchor",
    blurb: "Permanent, and each of its cells counts double toward holding a region.",
    permanent: true,
    territoryWeight: 2,
  },
  slumberstone: {
    id: "slumberstone",
    name: "Slumberstone",
    epithet: "Settling",
    category: "anchor",
    blurb: "Sleeps for a turn as it settles in, then becomes permanent.",
    dormant: true,
    permanent: true,
  },

  // ---- Drift ----------------------------------------------------
  breezefinch: {
    id: "breezefinch",
    name: "Breezefinch",
    epithet: "Flighty",
    category: "drift",
    blurb: "Adds 2 hops. A hop moves one of your critters to a neighbouring empty cell.",
    moveAdjacent: true,
    hops: 2,
  },
  tumbleweed: {
    id: "tumbleweed",
    name: "Tumbleweed",
    epithet: "Rolling",
    category: "drift",
    blurb: "Adds 4 hops, so your team can keep rearranging its cells.",
    moveAdjacent: true,
    hops: 4,
  },
  glidewing: {
    id: "glidewing",
    name: "Glidewing",
    epithet: "Soaring",
    category: "drift",
    blurb: "Adds 1 hop that may also move diagonally.",
    moveAdjacent: true,
    hops: 1,
    moveDiagonal: true,
  },

  // ---- Hush ----------------------------------------------------
  snoozemouse: {
    id: "snoozemouse",
    name: "Snoozemouse",
    epithet: "Drowsy",
    category: "hush",
    blurb: "Sleeps for one turn. It does not count toward a region until it wakes.",
    dormant: true,
  },
  fogkit: {
    id: "fogkit",
    name: "Fogkit",
    epithet: "Hazy",
    category: "hush",
    blurb: "Sleeps for two turns before it counts, stalling a region for longer.",
    dormant: true,
    dormantTurns: 2,
  },
  dozderling: {
    id: "dozderling",
    name: "Dozderling",
    epithet: "Dozy forager",
    category: "hush",
    blurb: "Sleeps for a turn, and stores 3 energy when placed.",
    dormant: true,
    energyBonus: 3,
  },

  // ---- Thrift -------------------------------------------------
  nutsquirrel: {
    id: "nutsquirrel",
    name: "Nutsquirrel",
    epithet: "Forager",
    category: "thrift",
    blurb: "Stores 2 energy when placed.",
    energyBonus: 2,
  },
  acorncache: {
    id: "acorncache",
    name: "Acorncache",
    epithet: "Hoarder",
    category: "thrift",
    blurb: "Stores 4 energy when placed.",
    energyBonus: 4,
  },
  sunbeetle: {
    id: "sunbeetle",
    name: "Sunbeetle",
    epithet: "Patient",
    category: "thrift",
    blurb: "Stores 1 energy when placed, and 3 more each time the opponent locks a region it sits in.",
    energyBonus: 1,
    energyOnOpponentLock: true,
  },

  // ---- Ward ----------------------------------------------------
  pricklehog: {
    id: "pricklehog",
    name: "Pricklehog",
    epithet: "Prickly",
    category: "ward",
    blurb: "The opponent can't lock a region by completing it while you hold a cell there.",
    denyOpponentLock: true,
  },
  shellclam: {
    id: "shellclam",
    name: "Shellclam",
    epithet: "First light",
    category: "ward",
    blurb: "When play freezes, tied regions where you hold a cell settle in your favour.",
    breakTiesToOwner: true,
  },
  barknewt: {
    id: "barknewt",
    name: "Barknewt",
    epithet: "Regrowing",
    category: "ward",
    blurb: "A Mole can't take it, and any other removal only sends it away for one turn.",
    regrowIfRemoved: true,
  },

  // ---- Snap ---------------------------------------------------
  swiftwren: {
    id: "swiftwren",
    name: "Swiftwren",
    epithet: "Restless",
    category: "snap",
    blurb: "Once a match, placing it lets you place a second digit now, then you forfeit your next turn.",
    extraPlacementOncePerGame: true,
  },
  digmole: {
    id: "digmole",
    name: "Digmole",
    epithet: "Burrowing",
    category: "snap",
    blurb: "Once a match, place it onto an opponent's non-permanent digit in a contested region to remove it.",
    replaceOncePerGame: true,
  },
  wildlark: {
    id: "wildlark",
    name: "Wildlark",
    epithet: "Rising",
    category: "snap",
    blurb: "Once a match, one placement may ignore the row, column and box rule (but can't complete a region).",
    wildOncePerGame: true,
  },
};

export const ALL_CREATURES: CreatureId[] = Object.keys(ROSTER) as CreatureId[];

export function creatureDef(id: CreatureId): CreatureDef {
  return ROSTER[id];
}

export function creaturesByCategory(cat: Category): CreatureDef[] {
  return ALL_CREATURES.map((id) => ROSTER[id]).filter((c) => c.category === cat);
}

/** digit i (1-based) -> ids[i-1] */
export function loadoutFromIds(ids: CreatureId[], size: number): Loadout {
  if (ids.length < size) {
    throw new Error(`loadout needs ${size} critters, got ${ids.length}`);
  }
  const out: Loadout = {};
  for (let d = 1; d <= size; d++) out[d] = ids[d - 1];
  return out;
}

export function randomLoadout(size: number, rng: RNG): Loadout {
  return loadoutFromIds(rng.shuffle(ALL_CREATURES.slice()).slice(0, size), size);
}
