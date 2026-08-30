import { AnimalId, Loadout } from "./types";
import { RNG } from "./rng";

/** A passive is a set of declarative capabilities the engine reads. Keeping
 *  them as flags (not closures) means GameState stays cloneable and the
 *  rules stay auditable in one place. */
export interface AnimalDef {
  id: AnimalId;
  name: string;
  epithet: string;
  blurb: string;

  /** never removed or moved by any effect */
  permanent?: boolean;
  /** may be moved to an orthogonally-adjacent empty legal cell as an action */
  moveAdjacent?: boolean;
  /** on placement, does not count toward completion/territory until the
   *  placer's next turn */
  dormant?: boolean;
  /** extra energy granted on placement, on top of the base */
  energyBonus?: number;
  /** the opponent cannot LOCK a region by completing it while you hold an
   *  active cell of this animal in that region (it goes to majority instead) */
  denyOpponentLock?: boolean;
  /** once per game, may be placed onto a non-permanent opponent cell,
   *  removing that digit */
  replaceOncePerGame?: boolean;
  /** if removed, returns to the same cell on the owner's next turn (if the
   *  cell is empty and the digit is still legal there) */
  regrowIfRemoved?: boolean;
  /** once per game, placing it grants an immediate extra placement */
  extraPlacementOncePerGame?: boolean;
  /** at the freeze, a tied region where you hold an active cell of this
   *  animal breaks to you */
  breakTiesToOwner?: boolean;
  /** weight per cell toward territory majority (default 1) */
  territoryWeight?: number;
  /** once per game, one placement of this digit ignores row/col/box */
  wildOncePerGame?: boolean;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  tortoise: {
    id: "tortoise",
    name: "Tortoise",
    epithet: "Steadfast",
    blurb: "Its cells are permanent — nothing can remove or move them.",
    permanent: true,
  },
  sparrow: {
    id: "sparrow",
    name: "Sparrow",
    epithet: "Flighty",
    blurb:
      "Twice a match, hop one of its cells to an adjacent empty legal cell (not to complete a region).",
    moveAdjacent: true,
  },
  dormouse: {
    id: "dormouse",
    name: "Dormouse",
    epithet: "Drowsy",
    blurb: "Sleeps when placed: it does not count toward a region until your next turn.",
    dormant: true,
  },
  squirrel: {
    id: "squirrel",
    name: "Squirrel",
    epithet: "Forager",
    blurb: "Placing it stores extra energy.",
    energyBonus: 2,
  },
  hedgehog: {
    id: "hedgehog",
    name: "Hedgehog",
    epithet: "Prickly",
    blurb: "Your opponent can't lock a region by completing it while you hold a cell there.",
    denyOpponentLock: true,
  },
  mole: {
    id: "mole",
    name: "Mole",
    epithet: "Burrowing",
    blurb:
      "Once a match, place it onto an opponent's non-permanent digit in a contested region to remove it.",
    replaceOncePerGame: true,
  },
  newt: {
    id: "newt",
    name: "Newt",
    epithet: "Regrowing",
    blurb:
      "A Mole can't take it; any other removal only sends it back for a turn, then it returns.",
    regrowIfRemoved: true,
  },
  wren: {
    id: "wren",
    name: "Wren",
    epithet: "Restless",
    blurb:
      "Once a match, placing it lets you place a second digit the same turn — but you forfeit your next turn.",
    extraPlacementOncePerGame: true,
  },
  robin: {
    id: "robin",
    name: "Robin",
    epithet: "First light",
    blurb: "When play freezes, tied regions where you hold a cell settle in your favour.",
    breakTiesToOwner: true,
  },
  otter: {
    id: "otter",
    name: "Otter",
    epithet: "Buoyant",
    blurb: "Each of its cells counts double toward holding a region.",
    territoryWeight: 2,
  },
  lark: {
    id: "lark",
    name: "Lark",
    epithet: "Rising",
    blurb:
      "Once a match, one placement may ignore the row, column and box rule (but can't complete a region).",
    wildOncePerGame: true,
  },
};

export const ALL_ANIMALS: AnimalId[] = Object.keys(ANIMALS) as AnimalId[];

export function animalDef(id: AnimalId): AnimalDef {
  return ANIMALS[id];
}

/** Build a loadout from an ordered list of animals (index i -> digit i+1). */
export function loadoutFrom(ids: AnimalId[], size: number): Loadout {
  if (ids.length < size) {
    throw new Error(`loadout needs ${size} animals, got ${ids.length}`);
  }
  const out: Loadout = {};
  for (let d = 1; d <= size; d++) out[d] = ids[d - 1];
  return out;
}

export function randomLoadout(size: number, rng: RNG): Loadout {
  const pool = rng.shuffle(ALL_ANIMALS.slice());
  return loadoutFrom(pool.slice(0, size), size);
}

/** A few hand-built teams for playtesting asymmetry. Order = digit 1..n. */
export const ARCHETYPES: Record<string, AnimalId[]> = {
  anchor: [
    "tortoise",
    "hedgehog",
    "newt",
    "robin",
    "otter",
    "dormouse",
    "squirrel",
    "sparrow",
    "wren",
  ],
  tempo: [
    "wren",
    "sparrow",
    "mole",
    "lark",
    "squirrel",
    "otter",
    "robin",
    "hedgehog",
    "tortoise",
  ],
  economy: [
    "squirrel",
    "otter",
    "robin",
    "dormouse",
    "newt",
    "hedgehog",
    "tortoise",
    "wren",
    "sparrow",
  ],
};

export function archetypeLoadout(name: keyof typeof ARCHETYPES, size: number): Loadout {
  return loadoutFrom(ARCHETYPES[name], size);
}
