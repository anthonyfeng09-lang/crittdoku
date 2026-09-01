export type Player = 0 | 1;

export function other(p: Player): Player {
  return (p === 0 ? 1 : 0) as Player;
}

/** Board geometry. box.rows * box.cols must equal size, and the box grid
 *  is (size / box.rows) boxes wide by (size / box.cols) boxes tall. */
export interface BoardConfig {
  size: number;
  box: { rows: number; cols: number };
}

export const CONFIG_9x9: BoardConfig = { size: 9, box: { rows: 3, cols: 3 } };
export const CONFIG_6x6: BoardConfig = { size: 6, box: { rows: 2, cols: 3 } };

export type RegionKind = "row" | "col" | "box";

export interface Region {
  id: number;
  kind: RegionKind;
  /** row/col/box ordinal within its kind */
  index: number;
  /** flat cell indices (r * size + c) that make up this region */
  cells: number[];
  filled: number;
  claimedBy: Player | null;
  /** move number (1-indexed) on which this region was completed/claimed */
  claimedOnTurn: number | null;
}

export interface Move {
  cell: number;
  digit: number;
}

/** a pre-placed cell; `owner` set means it counts as that player's
 *  territory from the start (used to compensate the first draft pick) */
export interface Seed extends Move {
  owner?: Player;
}

export type Action =
  | { type: "place"; cell: number; digit: number; wild?: boolean; burst?: boolean }
  | { type: "move"; from: number; to: number }
  | { type: "mine"; cell: number }
  | { type: "clear"; cell: number };

export interface AppliedMove {
  action: Action;
  by: Player;
  turn: number;
  /** regions claimed as a direct result of this action */
  claimed: number[];
  /** true if this action removed an opponent digit (Mole) */
  replaced?: boolean;
  /** true if the acting player still has an extra placement to make (Wren) */
  grantedExtra?: boolean;
}

export type EndReason =
  | "grid-full"
  | "no-legal-move"
  | "stalled"
  | null;

/** How regions that are still unclaimed when the game ends are scored.
 *  - "sweep":    the player who still had a move takes ALL of them (spec v1)
 *  - "keep":     they score for nobody; you only keep what you claimed in play
 *  - "majority": each goes to whoever holds the most cells in it (tie = nobody) */
export type EndScoring = "sweep" | "keep" | "majority";

export interface Rules {
  endScoring: EndScoring;
}

/** Territory scoring is the base game (see FINDINGS.md): the grid almost
 *  always deadlocks before it fills, so unclaimed regions are settled by
 *  who holds the most cells in them. Completing a region during play still
 *  claims + locks it early, which is now a tactical bonus rather than the
 *  main point source. */
export const DEFAULT_RULES: Rules = { endScoring: "majority" };

/** A player's team: which critter is bound to each digit 1..size. */
export type Loadout = Record<number, CreatureId>;

/** Energy price of each active ability. Placing a digit earns
 *  ENERGY_PER_PLACE; locking a region earns ENERGY_PER_CLAIM. Abilities are
 *  paid for from that pool, so an economy team can afford more of them. */
export const ABILITY_COST = {
  hop: 2,
  wild: 5,
  replace: 10,
  extra: 5,
  mine: 4,
  clear: 5,
} as const;

export type AbilityName = keyof typeof ABILITY_COST;

export interface RegrowEntry {
  cell: number;
  digit: number;
  owner: Player;
  /** action number after which the digit may regrow */
  at: number;
}

export interface GameState {
  config: BoardConfig;
  rules: Rules;
  /** length size*size, 0 = empty, else digit 1..size */
  grid: Int8Array;
  /** length size*size, -1 = empty/seeded, else player who placed */
  placedBy: Int8Array;
  /** true for cells that were pre-seeded */
  seeded: boolean[];
  /** 0 = not dormant; else the action number on which it was placed. The cell
   *  blocks legality immediately but does not count toward completion or
   *  territory until its owner's next turn (Dormouse). */
  dormant: Int32Array;
  regions: Region[];
  /** cell index -> [rowRegionId, colRegionId, boxRegionId] */
  cellRegions: Int16Array;
  /** per-region digit-presence bitmask, indexed by region id */
  regionMask: Int32Array;
  loadouts: [Loadout, Loadout];
  /** length size*size, -1 = no mine, else the player who laid it. A mined
   *  cell blocks normal placement by the other player until it is cleared;
   *  it counts as a held cell for its owner. */
  mines: Int8Array;
  regrow: RegrowEntry[];
  /** number of actions played so far */
  turn: number;
  /** consecutive actions that added no new digit to the grid (hops,
   *  replacements). Enough of these in a row freezes the game. */
  staleTurns: number;
  current: Player;
  /** the current player owes an extra placement before the turn passes (Wren) */
  pendingExtra: boolean;
  score: [number, number];
  energy: [number, number];
  status: "playing" | "ended";
  endReason: EndReason;
  /** higher score wins; equal score is a draw */
  winner: Player | "draw" | null;
  history: AppliedMove[];
}

export const ENERGY_PER_PLACE = 1;
export const ENERGY_PER_CLAIM = 5;

export type CreatureId =
  | "boulderpup"
  | "mossback"
  | "slumberstone"
  | "mudpaw"
  | "slatetusk"
  | "lichenox"
  | "breezefinch"
  | "tumbleweed"
  | "glidewing"
  | "driftmink"
  | "galepup"
  | "dandypuff"
  | "snoozemouse"
  | "fogkit"
  | "dozderling"
  | "drowsivole"
  | "lullabird"
  | "dreamnewt"
  | "nutsquirrel"
  | "acorncache"
  | "sunbeetle"
  | "tallykit"
  | "sunmoth"
  | "emberfinch"
  | "pricklehog"
  | "shellclam"
  | "barknewt"
  | "thornpod"
  | "quillhog"
  | "barkmole"
  | "swiftwren"
  | "digmole"
  | "wildlark"
  | "bombkit"
  | "joltjay"
  | "sparkpaw";
