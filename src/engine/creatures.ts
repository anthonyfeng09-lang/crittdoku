import { RNG } from "./rng";
import { CreatureId, Loadout } from "./types";

export type { CreatureId };

/* ------------------------------------------------------------------ *
 * The roster. Every critter is a set of declarative capabilities the
 * engine reads, so game state stays cloneable and the rules stay in one
 * place. Add new critters by appending to ROSTER (keep the CreatureId
 * union in src/engine/types.ts in sync). Each belongs to a CATEGORY,
 * shown to players as a friendly "type".
 * ------------------------------------------------------------------ */

export type Category = "anchor" | "drift" | "hush" | "thrift" | "ward" | "snap";

export interface CategoryDef {
  id: Category;
  name: string;
  element: string;
  tagline: string;
  hue: string;
}

export const CATEGORIES: Record<Category, CategoryDef> = {
  anchor: { id: "anchor", name: "Anchor", element: "Stone", tagline: "hold the ground", hue: "#22c55e" },
  drift: { id: "drift", name: "Drift", element: "Gust", tagline: "move after you land", hue: "#06b6d4" },
  hush: { id: "hush", name: "Hush", element: "Dream", tagline: "play with timing", hue: "#a855f7" },
  thrift: { id: "thrift", name: "Thrift", element: "Sun", tagline: "gather energy", hue: "#f59e0b" },
  ward: { id: "ward", name: "Ward", element: "Shell", tagline: "protect what you hold", hue: "#f43f5e" },
  snap: { id: "snap", name: "Snap", element: "Spark", tagline: "disrupt the board", hue: "#fb923c" },
};

export interface CreatureDef {
  id: CreatureId;
  name: string;
  epithet: string;
  category: Category;
  /** one-line plain-English description of the passive */
  blurb: string;

  // --- passive capabilities (always on) ---
  /** cells are permanent: nothing can move or remove them */
  permanent?: boolean;
  /** on placement, does not count toward completion/territory until it wakes */
  dormant?: boolean;
  /** turns asleep before it wakes (default 1) */
  dormantTurns?: number;
  /** on wake, lock any of its regions its owner is leading */
  claimRegionsOnWake?: boolean;
  /** flat energy stored on placement */
  energyBonus?: number;
  /** on placement, stores 2 energy for every mine you currently hold */
  minesScaleEnergy?: boolean;
  /** +3 energy whenever the opponent locks a region an active one sits in */
  energyOnOpponentLock?: boolean;
  /** the opponent can't LOCK a region by completion while you hold an active
   *  cell there (it goes to majority instead) */
  denyOpponentLock?: boolean;
  /** a Mole can't take it; other removal only delays it a turn */
  regrowIfRemoved?: boolean;
  /** at the freeze, a tied region where you hold an active cell breaks to you */
  breakTiesToOwner?: boolean;
  /** weight per cell toward territory (default 1) */
  territoryWeight?: number;

  // --- abilities (cost energy, repeatable) ---
  /** its cells can hop to an adjacent empty cell (cost: hop) */
  moveAdjacent?: boolean;
  /** its hops may also move diagonally */
  moveDiagonal?: boolean;
  /** placing this digit, you may pay to place a second digit the same turn */
  canBurst?: boolean;
  /** pay to place this digit onto an opponent's non-permanent digit in a
   *  contested region, removing it */
  canMole?: boolean;
  /** pay to place this digit ignoring the row/col/box rule (not to complete) */
  canWild?: boolean;
  /** pay to lay a mine on an empty cell: the opponent can't place there until
   *  they clear it, and it counts as a cell you hold */
  canMine?: boolean;
  /** your mines cost 2 less to lay */
  cheapMines?: boolean;
  /** each of your mines counts this much toward territory (default 1) */
  mineWeight?: number;
}

export const ROSTER: Record<CreatureId, CreatureDef> = {
  // ---- Anchor / Stone -------------------------------------------
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
    blurb: "Each of its cells counts double toward holding a region.",
    territoryWeight: 2,
  },
  slumberstone: {
    id: "slumberstone",
    name: "Slumberstone",
    epithet: "Settling",
    category: "anchor",
    blurb: "Sleeps a turn as it settles in, then becomes permanent.",
    dormant: true,
    permanent: true,
  },

  // ---- Drift / Gust --------------------------------------------
  breezefinch: {
    id: "breezefinch",
    name: "Breezefinch",
    epithet: "Flighty",
    category: "drift",
    blurb: "Its cells can hop to an adjacent empty cell.",
    moveAdjacent: true,
  },
  tumbleweed: {
    id: "tumbleweed",
    name: "Tumbleweed",
    epithet: "Rolling",
    category: "drift",
    blurb: "Its cells can hop, and it stores 1 energy on placement to help pay for hops.",
    moveAdjacent: true,
    energyBonus: 1,
  },
  glidewing: {
    id: "glidewing",
    name: "Glidewing",
    epithet: "Soaring",
    category: "drift",
    blurb: "Its cells can hop, and its hops may also move diagonally.",
    moveAdjacent: true,
    moveDiagonal: true,
  },

  // ---- Hush / Dream -------------------------------------------
  snoozemouse: {
    id: "snoozemouse",
    name: "Snoozemouse",
    epithet: "Drowsy",
    category: "hush",
    blurb: "Sleeps a turn, then wakes and locks any of its regions you are leading.",
    dormant: true,
    claimRegionsOnWake: true,
  },
  fogkit: {
    id: "fogkit",
    name: "Fogkit",
    epithet: "Hazy",
    category: "hush",
    blurb: "Sleeps two turns, then wakes and locks any of its regions you are leading. A big delayed pounce.",
    dormant: true,
    dormantTurns: 2,
    claimRegionsOnWake: true,
  },
  dozderling: {
    id: "dozderling",
    name: "Dozderling",
    epithet: "Dozy forager",
    category: "hush",
    blurb: "Stores 3 energy, sleeps a turn, then wakes and locks any of its regions you are leading.",
    dormant: true,
    energyBonus: 3,
    claimRegionsOnWake: true,
  },

  // ---- Thrift / Sun ------------------------------------------
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
    blurb: "Stores 1 energy, and 3 more each time the opponent locks a region it sits in.",
    energyBonus: 1,
    energyOnOpponentLock: true,
  },
  tallykit: {
    id: "tallykit",
    name: "Tallykit",
    epithet: "Counter",
    category: "thrift",
    blurb: "Stores 2 energy for every mine you currently hold. Pairs with Thornpod.",
    minesScaleEnergy: true,
  },

  // ---- Ward / Shell -----------------------------------------
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
    blurb: "A Mole can't take it, and any other removal only sends it away for a turn.",
    regrowIfRemoved: true,
  },
  thornpod: {
    id: "thornpod",
    name: "Thornpod",
    epithet: "Warding",
    category: "ward",
    blurb: "Pay energy to lay a mine (up to 3): the opponent can't place there until they clear it, and it counts as a cell you hold.",
    canMine: true,
  },
  quillhog: {
    id: "quillhog",
    name: "Quillhog",
    epithet: "Bristling",
    category: "ward",
    blurb: "Each of your mines counts double toward holding a region. Pairs with Thornpod.",
    mineWeight: 2,
  },

  // ---- Snap / Spark ----------------------------------------
  swiftwren: {
    id: "swiftwren",
    name: "Swiftwren",
    epithet: "Restless",
    category: "snap",
    blurb: "When you place this digit you may pay energy to place a second digit the same turn.",
    canBurst: true,
  },
  digmole: {
    id: "digmole",
    name: "Digmole",
    epithet: "Burrowing",
    category: "snap",
    blurb: "Pay energy to place this digit onto an opponent's non-permanent digit in a contested region, removing it.",
    canMole: true,
  },
  wildlark: {
    id: "wildlark",
    name: "Wildlark",
    epithet: "Rising",
    category: "snap",
    blurb: "Pay energy to place this digit ignoring the row, column and box rule (but not to complete a region).",
    canWild: true,
  },
  bombkit: {
    id: "bombkit",
    name: "Bombkit",
    epithet: "Fizzing",
    category: "snap",
    blurb: "Your mines cost 2 less to lay. Pairs with Thornpod.",
    cheapMines: true,
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
