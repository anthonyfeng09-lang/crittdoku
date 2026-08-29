import {
  AppliedMove,
  BoardConfig,
  CONFIG_9x9,
  DEFAULT_RULES,
  ENERGY_PER_CLAIM,
  ENERGY_PER_PLACE,
  GameState,
  Move,
  Player,
  Region,
  Rules,
  other,
} from "./types";

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

interface Geometry {
  size: number;
  cellCount: number;
  boxesPerRow: number; // number of boxes horizontally
  boxesPerCol: number; // number of boxes vertically
  boxCount: number;
}

export function geometry(config: BoardConfig): Geometry {
  const { size, box } = config;
  if (box.rows * box.cols !== size) {
    throw new Error(`invalid box ${box.rows}x${box.cols} for size ${size}`);
  }
  const boxesPerRow = size / box.cols;
  const boxesPerCol = size / box.rows;
  return {
    size,
    cellCount: size * size,
    boxesPerRow,
    boxesPerCol,
    boxCount: boxesPerRow * boxesPerCol,
  };
}

export function boxIndexOf(config: BoardConfig, r: number, c: number): number {
  const g = geometry(config);
  const boxRow = Math.floor(r / config.box.rows);
  const boxCol = Math.floor(c / config.box.cols);
  return boxRow * g.boxesPerRow + boxCol;
}

/* ------------------------------------------------------------------ *
 * Region construction
 * ------------------------------------------------------------------ */

function buildRegions(config: BoardConfig): {
  regions: Region[];
  cellRegions: Int16Array;
} {
  const g = geometry(config);
  const { size } = config;
  const regions: Region[] = [];
  const cellRegions = new Int16Array(g.cellCount * 3);

  const mk = (kind: Region["kind"], index: number): Region => {
    const region: Region = {
      id: regions.length,
      kind,
      index,
      cells: [],
      filled: 0,
      claimedBy: null,
      claimedOnTurn: null,
    };
    regions.push(region);
    return region;
  };

  const rows = Array.from({ length: size }, (_, i) => mk("row", i));
  const cols = Array.from({ length: size }, (_, i) => mk("col", i));
  const boxes = Array.from({ length: g.boxCount }, (_, i) => mk("box", i));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = r * size + c;
      const b = boxIndexOf(config, r, c);
      rows[r].cells.push(cell);
      cols[c].cells.push(cell);
      boxes[b].cells.push(cell);
      cellRegions[cell * 3 + 0] = rows[r].id;
      cellRegions[cell * 3 + 1] = cols[c].id;
      cellRegions[cell * 3 + 2] = boxes[b].id;
    }
  }

  return { regions, cellRegions };
}

/* ------------------------------------------------------------------ *
 * Game creation
 * ------------------------------------------------------------------ */

export interface CreateOptions {
  config?: BoardConfig;
  rules?: Partial<Rules>;
  seeds?: Move[];
  firstPlayer?: Player;
}

export function createGame(opts: CreateOptions = {}): GameState {
  const config = opts.config ?? CONFIG_9x9;
  const g = geometry(config);
  const { regions, cellRegions } = buildRegions(config);

  const state: GameState = {
    config,
    rules: { ...DEFAULT_RULES, ...opts.rules },
    grid: new Int8Array(g.cellCount),
    placedBy: new Int8Array(g.cellCount).fill(-1),
    seeded: new Array(g.cellCount).fill(false),
    regions,
    cellRegions,
    regionMask: new Int32Array(regions.length),
    turn: 0,
    current: opts.firstPlayer ?? 0,
    score: [0, 0],
    energy: [0, 0],
    status: "playing",
    endReason: null,
    winner: null,
    history: [],
  };

  for (const seed of opts.seeds ?? []) {
    if (!isLegal(state, seed.cell, seed.digit)) {
      throw new Error(
        `illegal seed: digit ${seed.digit} at cell ${seed.cell}`,
      );
    }
    placeRaw(state, seed.cell, seed.digit, -1 as Player, { seeded: true });
  }

  return state;
}

/* ------------------------------------------------------------------ *
 * Legality
 * ------------------------------------------------------------------ */

export function isLegal(state: GameState, cell: number, digit: number): boolean {
  if (digit < 1 || digit > state.config.size) return false;
  if (state.grid[cell] !== 0) return false;
  const bit = 1 << digit;
  const base = cell * 3;
  if (state.regionMask[state.cellRegions[base + 0]] & bit) return false;
  if (state.regionMask[state.cellRegions[base + 1]] & bit) return false;
  if (state.regionMask[state.cellRegions[base + 2]] & bit) return false;
  return true;
}

/** All legal moves for whichever player is to move (legality does not
 *  currently depend on the player — abilities will change that). */
export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  if (state.status !== "playing") return moves;
  const { size } = state.config;
  for (let cell = 0; cell < state.grid.length; cell++) {
    if (state.grid[cell] !== 0) continue;
    const base = cell * 3;
    const used =
      state.regionMask[state.cellRegions[base + 0]] |
      state.regionMask[state.cellRegions[base + 1]] |
      state.regionMask[state.cellRegions[base + 2]];
    for (let d = 1; d <= size; d++) {
      if (!(used & (1 << d))) moves.push({ cell, digit: d });
    }
  }
  return moves;
}

export function hasLegalMove(state: GameState): boolean {
  if (state.status !== "playing") return false;
  const { size } = state.config;
  for (let cell = 0; cell < state.grid.length; cell++) {
    if (state.grid[cell] !== 0) continue;
    const base = cell * 3;
    const used =
      state.regionMask[state.cellRegions[base + 0]] |
      state.regionMask[state.cellRegions[base + 1]] |
      state.regionMask[state.cellRegions[base + 2]];
    for (let d = 1; d <= size; d++) {
      if (!(used & (1 << d))) return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Applying moves
 * ------------------------------------------------------------------ */

function placeRaw(
  state: GameState,
  cell: number,
  digit: number,
  by: Player,
  opts: { seeded?: boolean } = {},
): number[] {
  state.grid[cell] = digit;
  state.placedBy[cell] = by;
  if (opts.seeded) state.seeded[cell] = true;

  const bit = 1 << digit;
  const claimed: number[] = [];
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[cell * 3 + k];
    state.regionMask[rid] |= bit;
    const region = state.regions[rid];
    region.filled++;
    if (
      region.filled === state.config.size &&
      region.claimedBy === null &&
      by >= 0
    ) {
      region.claimedBy = by;
      region.claimedOnTurn = state.turn + 1;
      claimed.push(rid);
    }
  }
  return claimed;
}

export function applyMove(state: GameState, move: Move): GameState {
  if (state.status !== "playing") {
    throw new Error("game already ended");
  }
  if (!isLegal(state, move.cell, move.digit)) {
    throw new Error(
      `illegal move: digit ${move.digit} at cell ${move.cell}`,
    );
  }

  const by = state.current;
  state.turn++;
  const claimed = placeRaw(state, move.cell, move.digit, by);

  state.energy[by] += ENERGY_PER_PLACE;
  for (const _rid of claimed) {
    state.score[by] += 1;
    state.energy[by] += ENERGY_PER_CLAIM;
  }

  const applied: AppliedMove = {
    cell: move.cell,
    digit: move.digit,
    by,
    turn: state.turn,
    claimed,
  };
  state.history.push(applied);

  // End condition 1: the grid is completely full.
  let empty = false;
  for (let i = 0; i < state.grid.length; i++) {
    if (state.grid[i] === 0) {
      empty = true;
      break;
    }
  }
  if (!empty) {
    return endGame(state, "grid-full", null);
  }

  // Otherwise pass the turn.
  state.current = other(by);

  // End condition 2: the player to move has no legal move. Unclaimed
  // regions are settled according to state.rules.endScoring.
  if (!hasLegalMove(state)) {
    return endGame(state, "no-legal-move", state.current);
  }

  return state;
}

function settleRegion(
  state: GameState,
  region: Region,
  stuckPlayer: Player,
): Player | null {
  switch (state.rules.endScoring) {
    case "sweep":
      return other(stuckPlayer);
    case "keep":
      return null;
    case "majority": {
      let a = 0;
      let b = 0;
      for (const cell of region.cells) {
        if (state.placedBy[cell] === 0) a++;
        else if (state.placedBy[cell] === 1) b++;
      }
      return a === b ? null : a > b ? 0 : 1;
    }
  }
}

function endGame(
  state: GameState,
  reason: NonNullable<GameState["endReason"]>,
  stuckPlayer: Player | null,
): GameState {
  if (reason === "no-legal-move" && stuckPlayer !== null) {
    for (const region of state.regions) {
      if (region.claimedBy !== null) continue;
      const winner = settleRegion(state, region, stuckPlayer);
      if (winner !== null) {
        region.claimedBy = winner;
        region.claimedOnTurn = state.turn;
        state.score[winner] += 1;
        state.energy[winner] += ENERGY_PER_CLAIM;
      }
    }
  }
  state.status = "ended";
  state.endReason = reason;
  state.winner =
    state.score[0] === state.score[1]
      ? "draw"
      : state.score[0] > state.score[1]
        ? 0
        : 1;
  return state;
}

/* ------------------------------------------------------------------ *
 * Cloning
 * ------------------------------------------------------------------ */

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    grid: state.grid.slice(),
    placedBy: state.placedBy.slice(),
    seeded: state.seeded.slice(),
    // regions are mutated in place, so deep-copy them
    regions: state.regions.map((r) => ({ ...r, cells: r.cells })),
    cellRegions: state.cellRegions, // never mutated
    regionMask: state.regionMask.slice(),
    score: [state.score[0], state.score[1]],
    energy: [state.energy[0], state.energy[1]],
    history: state.history.slice(),
  };
}

/* ------------------------------------------------------------------ *
 * Small helpers for UI / sim
 * ------------------------------------------------------------------ */

export function rc(state: GameState, cell: number): { r: number; c: number } {
  const size = state.config.size;
  return { r: Math.floor(cell / size), c: cell % size };
}

export function regionLabel(region: Region): string {
  return `${region.kind} ${region.index + 1}`;
}
