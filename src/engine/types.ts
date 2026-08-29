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

export interface AppliedMove extends Move {
  by: Player;
  turn: number;
  /** regions claimed as a direct result of this move */
  claimed: number[];
}

export type EndReason = "grid-full" | "no-legal-move" | null;

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

export interface GameState {
  config: BoardConfig;
  rules: Rules;
  /** length size*size, 0 = empty, else digit 1..size */
  grid: Int8Array;
  /** length size*size, -1 = empty/seeded, else player who placed */
  placedBy: Int8Array;
  /** true for cells that were pre-seeded */
  seeded: boolean[];
  regions: Region[];
  /** cell index -> [rowRegionId, colRegionId, boxRegionId] */
  cellRegions: Int16Array;
  /** per-region digit-presence bitmask, indexed by region id */
  regionMask: Int32Array;
  /** number of moves played so far */
  turn: number;
  current: Player;
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
