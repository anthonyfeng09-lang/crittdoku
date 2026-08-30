import { ANIMALS, AnimalDef } from "./animals";
import {
  Action,
  AnimalId,
  BoardConfig,
  Charges,
  CONFIG_9x9,
  DEFAULT_RULES,
  ENERGY_PER_CLAIM,
  ENERGY_PER_PLACE,
  GameState,
  Loadout,
  Move,
  Player,
  Region,
  Rules,
  fullCharges,
  other,
} from "./types";

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

interface Geometry {
  size: number;
  cellCount: number;
  boxesPerRow: number;
  boxesPerCol: number;
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
 * Animals
 * ------------------------------------------------------------------ */

export function animalFor(
  state: GameState,
  player: Player,
  digit: number,
): AnimalDef | null {
  const id = state.loadouts[player]?.[digit] as AnimalId | undefined;
  return id ? ANIMALS[id] : null;
}

export function animalAt(state: GameState, cell: number): AnimalDef | null {
  const digit = state.grid[cell];
  const by = state.placedBy[cell];
  if (digit === 0 || by < 0) return null;
  return animalFor(state, by as Player, digit);
}

/** grid-occupied and not sleeping — counts toward completion and territory */
export function isActive(state: GameState, cell: number): boolean {
  return state.grid[cell] !== 0 && state.dormant[cell] === 0;
}

function isPermanent(state: GameState, cell: number): boolean {
  return animalAt(state, cell)?.permanent === true;
}

/* ------------------------------------------------------------------ *
 * Game creation
 * ------------------------------------------------------------------ */

export interface CreateOptions {
  config?: BoardConfig;
  rules?: Partial<Rules>;
  seeds?: Move[];
  firstPlayer?: Player;
  loadouts?: [Loadout, Loadout];
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
    dormant: new Int32Array(g.cellCount),
    regions,
    cellRegions,
    regionMask: new Int32Array(regions.length),
    loadouts: opts.loadouts ?? [{}, {}],
    charges: [fullCharges(), fullCharges()],
    regrow: [],
    turn: 0,
    staleTurns: 0,
    current: opts.firstPlayer ?? 0,
    pendingExtra: false,
    skipNext: [false, false],
    score: [0, 0],
    energy: [0, 0],
    status: "playing",
    endReason: null,
    winner: null,
    history: [],
  };

  for (const seed of opts.seeds ?? []) {
    if (!isLegal(state, seed.cell, seed.digit)) {
      throw new Error(`illegal seed: digit ${seed.digit} at cell ${seed.cell}`);
    }
    fillCell(state, seed.cell, seed.digit, -1 as Player, false, 0, true);
  }

  return state;
}

/* ------------------------------------------------------------------ *
 * Legality
 * ------------------------------------------------------------------ */

export function isLegal(
  state: GameState,
  cell: number,
  digit: number,
  opts: { wild?: boolean } = {},
): boolean {
  if (digit < 1 || digit > state.config.size) return false;
  if (state.grid[cell] !== 0) return false;
  if (opts.wild) return true;
  const bit = 1 << digit;
  const base = cell * 3;
  if (state.regionMask[state.cellRegions[base + 0]] & bit) return false;
  if (state.regionMask[state.cellRegions[base + 1]] & bit) return false;
  if (state.regionMask[state.cellRegions[base + 2]] & bit) return false;
  return true;
}

/** normal placements only — the milestone-1/2 move set, still used widely */
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
  return legalMoves(state).length > 0;
}

export function adjacentCells(state: GameState, cell: number): number[] {
  const size = state.config.size;
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

function regionsClaimed(state: GameState, cell: number): boolean {
  for (let k = 0; k < 3; k++) {
    if (state.regions[state.cellRegions[cell * 3 + k]].claimedBy !== null) {
      return true;
    }
  }
  return false;
}

/** would putting an active digit in `cell` complete (fill) a region? */
function wouldComplete(state: GameState, cell: number): boolean {
  for (let k = 0; k < 3; k++) {
    const region = state.regions[state.cellRegions[cell * 3 + k]];
    if (region.claimedBy === null && region.filled === state.config.size - 1) {
      return true;
    }
  }
  return false;
}

/** is `cell` in a region the given player is contesting — leading on
 *  territory, or one move from completing? (gates Mole) */
function contestedBy(state: GameState, cell: number, player: Player): boolean {
  for (let k = 0; k < 3; k++) {
    const region = state.regions[state.cellRegions[cell * 3 + k]];
    if (region.claimedBy !== null) continue;
    if (region.filled === state.config.size - 1) return true;
    if (territoryHolder(state, region) === player) return true;
  }
  return false;
}

/** Can `by` place `digit` onto the already-occupied `cell`, removing what's
 *  there? (Mole) */
function canReplace(
  state: GameState,
  cell: number,
  digit: number,
  by: Player,
): boolean {
  if (!state.charges[by].mole) return false;
  if (animalFor(state, by, digit)?.replaceOncePerGame !== true) return false;
  const victim = state.placedBy[cell];
  if (victim !== other(by)) return false;
  if (isPermanent(state, cell)) return false;
  if (animalAt(state, cell)?.regrowIfRemoved === true) return false;
  if (regionsClaimed(state, cell)) return false;
  // Mole must matter: the target has to sit in a region the victim is
  // contesting, not just any stray cell
  if (!contestedBy(state, cell, victim as Player)) return false;
  // the new digit must be legal once the victim is gone
  const vbit = 1 << state.grid[cell];
  const bit = 1 << digit;
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[cell * 3 + k];
    let mask = state.regionMask[rid];
    if (state.grid[cell] !== digit) mask &= ~vbit; // victim leaving
    if (mask & bit) return false;
  }
  return true;
}

/** All actions available to the player to move: normal + wild placements,
 *  Mole replacements, Sparrow hops. Used for stuck detection and bots. */
export function legalActions(state: GameState): Action[] {
  const out: Action[] = [];
  if (state.status !== "playing") return out;
  const by = state.current;
  const { size } = state.config;

  const larkDigits: number[] = [];
  const moleDigits: number[] = [];
  for (let d = 1; d <= size; d++) {
    const a = animalFor(state, by, d);
    if (a?.wildOncePerGame && state.charges[by].lark) larkDigits.push(d);
    if (a?.replaceOncePerGame && state.charges[by].mole) moleDigits.push(d);
  }

  for (let cell = 0; cell < state.grid.length; cell++) {
    if (state.grid[cell] === 0) {
      for (let d = 1; d <= size; d++) {
        if (isLegal(state, cell, d)) out.push({ type: "place", cell, digit: d });
      }
      if (larkDigits.length && !wouldComplete(state, cell)) {
        for (const d of larkDigits) {
          out.push({ type: "place", cell, digit: d, wild: true });
        }
      }
    } else if (moleDigits.length && state.placedBy[cell] === other(by)) {
      for (const d of moleDigits) {
        if (canReplace(state, cell, d, by)) {
          out.push({ type: "place", cell, digit: d });
        }
      }
    }
  }

  // Sparrow hops
  if (state.charges[by].hops > 0) {
    for (let cell = 0; cell < state.grid.length; cell++) {
      if (state.placedBy[cell] !== by || !isActive(state, cell)) continue;
      if (animalAt(state, cell)?.moveAdjacent !== true) continue;
      if (regionsClaimed(state, cell)) continue;
      const digit = state.grid[cell];
      for (const to of adjacentCells(state, cell)) {
        if (state.grid[to] !== 0) continue;
        if (moveLegal(state, cell, to, digit) && !wouldComplete(state, to)) {
          out.push({ type: "move", from: cell, to });
        }
      }
    }
  }

  return out;
}

export function hasAnyAction(state: GameState): boolean {
  if (hasLegalMove(state)) return true;
  return legalActions(state).length > 0;
}

function moveLegal(
  state: GameState,
  from: number,
  to: number,
  digit: number,
): boolean {
  if (state.grid[to] !== 0) return false;
  const bit = 1 << digit;
  const fromRegions = [
    state.cellRegions[from * 3 + 0],
    state.cellRegions[from * 3 + 1],
    state.cellRegions[from * 3 + 2],
  ];
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[to * 3 + k];
    let mask = state.regionMask[rid];
    if (fromRegions.includes(rid)) mask &= ~bit; // the mover is leaving
    if (mask & bit) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * Region / cell mutation
 * ------------------------------------------------------------------ */

/** Lock a region to `by` on completion, unless an opponent's Hedgehog cell
 *  forbids it. Returns whether the lock actually happened. */
function lockRegion(
  state: GameState,
  region: Region,
  by: Player,
  turn: number,
): boolean {
  if (region.claimedBy !== null || by < 0) return false;
  const opp = other(by);
  for (const cell of region.cells) {
    if (
      state.placedBy[cell] === opp &&
      isActive(state, cell) &&
      animalAt(state, cell)?.denyOpponentLock === true
    ) {
      return false;
    }
  }
  region.claimedBy = by;
  region.claimedOnTurn = turn;
  return true;
}

/** Put `digit` into an empty `cell`. Returns region ids newly locked. */
function fillCell(
  state: GameState,
  cell: number,
  digit: number,
  by: Player,
  dormant: boolean,
  turn: number,
  seeded = false,
): number[] {
  state.grid[cell] = digit;
  state.placedBy[cell] = by;
  if (seeded) state.seeded[cell] = true;
  if (dormant) state.dormant[cell] = Math.max(1, state.turn);

  const bit = 1 << digit;
  const claimed: number[] = [];
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[cell * 3 + k];
    state.regionMask[rid] |= bit;
    if (dormant) continue;
    const region = state.regions[rid];
    region.filled++;
    if (region.filled === state.config.size && lockRegion(state, region, by, turn)) {
      claimed.push(rid);
    }
  }
  return claimed;
}

function activateCell(state: GameState, cell: number, turn: number): number[] {
  state.dormant[cell] = 0;
  const by = state.placedBy[cell] as Player;
  const claimed: number[] = [];
  for (let k = 0; k < 3; k++) {
    const region = state.regions[state.cellRegions[cell * 3 + k]];
    region.filled++;
    if (region.filled === state.config.size && lockRegion(state, region, by, turn)) {
      claimed.push(region.id);
    }
  }
  return claimed;
}

/** Remove whatever is in `cell` (never call on a cell in a claimed region). */
function clearCell(state: GameState, cell: number): void {
  const digit = state.grid[cell];
  if (digit === 0) return;
  const wasDormant = state.dormant[cell] !== 0;
  const bit = 1 << digit;
  state.grid[cell] = 0;
  state.placedBy[cell] = -1;
  state.dormant[cell] = 0;
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[cell * 3 + k];
    state.regionMask[rid] &= ~bit; // sudoku => this was the only one
    if (!wasDormant) state.regions[rid].filled--;
  }
}

/* ------------------------------------------------------------------ *
 * Applying actions
 * ------------------------------------------------------------------ */

/** consecutive no-progress actions (hops / replacements) that freeze the game */
export const STALE_LIMIT = 6;

export function applyMove(state: GameState, move: Move): GameState {
  return applyAction(state, { type: "place", cell: move.cell, digit: move.digit });
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.status !== "playing") throw new Error("game already ended");

  const by = state.current;
  state.turn++;
  let claimed: number[] = [];
  let replaced = false;
  let placedDigit = 0;

  if (action.type === "move") {
    const { from, to } = action;
    const digit = state.grid[from];
    if (
      state.charges[by].hops <= 0 ||
      state.placedBy[from] !== by ||
      !isActive(state, from) ||
      animalAt(state, from)?.moveAdjacent !== true ||
      regionsClaimed(state, from) ||
      !adjacentCells(state, from).includes(to) ||
      !moveLegal(state, from, to, digit) ||
      wouldComplete(state, to)
    ) {
      throw new Error(`illegal move ${from} -> ${to}`);
    }
    state.charges[by].hops -= 1;
    clearCell(state, from);
    claimed = fillCell(state, to, digit, by, false, state.turn);
    state.energy[by] += ENERGY_PER_PLACE;
  } else {
    const { cell, digit } = action;
    placedDigit = digit;
    if (action.wild) {
      if (
        !state.charges[by].lark ||
        animalFor(state, by, digit)?.wildOncePerGame !== true ||
        state.grid[cell] !== 0 ||
        wouldComplete(state, cell)
      ) {
        throw new Error("illegal wild placement");
      }
      state.charges[by].lark = false;
      claimed = fillCell(state, cell, digit, by, false, state.turn);
    } else if (state.grid[cell] !== 0) {
      if (!canReplace(state, cell, digit, by)) {
        throw new Error("illegal replacement");
      }
      state.charges[by].mole = false;
      replaced = true;
      const victimDigit = state.grid[cell];
      const victimBy = state.placedBy[cell] as Player;
      const victimAnimal = animalFor(state, victimBy, victimDigit);
      clearCell(state, cell);
      if (victimAnimal?.regrowIfRemoved) {
        state.regrow.push({
          cell,
          digit: victimDigit,
          owner: victimBy,
          at: state.turn,
        });
      }
      claimed = fillCell(state, cell, digit, by, false, state.turn);
    } else {
      if (!isLegal(state, cell, digit)) {
        throw new Error(`illegal move: digit ${digit} at cell ${cell}`);
      }
      const dormant = animalFor(state, by, digit)?.dormant === true;
      claimed = fillCell(state, cell, digit, by, dormant, state.turn);
    }
    state.energy[by] += ENERGY_PER_PLACE;
    const bonus = animalFor(state, by, digit)?.energyBonus ?? 0;
    state.energy[by] += bonus;
  }

  for (const _rid of claimed) {
    state.score[by] += 1;
    state.energy[by] += ENERGY_PER_CLAIM;
  }

  const wasPendingExtra = state.pendingExtra;
  let grantedExtra = false;
  if (
    !wasPendingExtra &&
    action.type === "place" &&
    !action.wild &&
    !replaced &&
    placedDigit > 0 &&
    animalFor(state, by, placedDigit)?.extraPlacementOncePerGame === true &&
    state.charges[by].wren
  ) {
    state.charges[by].wren = false;
    state.pendingExtra = true;
    grantedExtra = true;
  }

  state.history.push({
    action,
    by,
    turn: state.turn,
    claimed,
    replaced: replaced || undefined,
    grantedExtra: grantedExtra || undefined,
  });

  // a hop or a replacement adds no new digit; too many in a row and the
  // game is stalling, so freeze it
  const progressed = action.type === "place" && !replaced;
  state.staleTurns = progressed ? 0 : state.staleTurns + 1;

  if (isGridFull(state)) return endGame(state, "grid-full", null);
  if (state.staleTurns >= STALE_LIMIT) {
    return endGame(state, "stalled", other(by));
  }

  if (grantedExtra) {
    // same player places again; if they somehow can't, fall through to pass
    if (hasAnyAction(state)) return state;
    state.pendingExtra = false;
  }

  if (wasPendingExtra) {
    state.pendingExtra = false;
    state.skipNext[by] = true; // the Wren burst costs the next turn
  }

  state.current = other(by);
  beginTurn(state);
  return state;
}

function beginTurn(state: GameState): GameState {
  const p = state.current;

  // a forfeited turn (Wren burst) — hand it straight back
  if (state.skipNext[p]) {
    state.skipNext[p] = false;
    state.current = other(p);
    return beginTurn(state);
  }

  // wake this player's dormant cells placed on an earlier turn
  for (let cell = 0; cell < state.grid.length; cell++) {
    if (
      state.dormant[cell] !== 0 &&
      state.placedBy[cell] === p &&
      state.dormant[cell] < state.turn
    ) {
      const claimed = activateCell(state, cell, state.turn);
      for (const _rid of claimed) {
        state.score[p] += 1;
        state.energy[p] += ENERGY_PER_CLAIM;
      }
    }
  }

  // regrow this player's removed Newt digits
  state.regrow = state.regrow.filter((e) => {
    if (e.owner !== p || e.at >= state.turn) return true;
    if (state.grid[e.cell] === 0 && isLegal(state, e.cell, e.digit)) {
      const claimed = fillCell(state, e.cell, e.digit, p, false, state.turn);
      for (const _rid of claimed) {
        state.score[p] += 1;
        state.energy[p] += ENERGY_PER_CLAIM;
      }
    }
    return false;
  });

  if (isGridFull(state)) return endGame(state, "grid-full", null);
  if (!hasAnyAction(state)) return endGame(state, "no-legal-move", p);
  return state;
}

function isGridFull(state: GameState): boolean {
  for (let i = 0; i < state.grid.length; i++) if (state.grid[i] === 0) return false;
  return true;
}

/* ------------------------------------------------------------------ *
 * Ending
 * ------------------------------------------------------------------ */

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
    case "majority":
      return territoryHolder(state, region);
  }
}

function endGame(
  state: GameState,
  reason: NonNullable<GameState["endReason"]>,
  stuckPlayer: Player | null,
): GameState {
  if (reason !== "grid-full" && stuckPlayer !== null) {
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
  state.winner = decideWinner(state);
  return state;
}

/** regions total, then — on a tie — regions locked in play, then energy */
function decideWinner(state: GameState): Player | "draw" {
  if (state.score[0] !== state.score[1]) {
    return state.score[0] > state.score[1] ? 0 : 1;
  }
  const locked: [number, number] = [0, 0];
  for (const r of state.regions) {
    if (r.claimedBy !== null && r.filled === state.config.size) {
      locked[r.claimedBy]++;
    }
  }
  if (locked[0] !== locked[1]) return locked[0] > locked[1] ? 0 : 1;
  if (state.energy[0] !== state.energy[1]) {
    return state.energy[0] > state.energy[1] ? 0 : 1;
  }
  return "draw";
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
    dormant: state.dormant.slice(),
    regions: state.regions.map((r) => ({ ...r, cells: r.cells })),
    cellRegions: state.cellRegions,
    regionMask: state.regionMask.slice(),
    loadouts: state.loadouts,
    charges: [{ ...state.charges[0] }, { ...state.charges[1] }] as [
      Charges,
      Charges,
    ],
    regrow: state.regrow.map((e) => ({ ...e })),
    skipNext: [state.skipNext[0], state.skipNext[1]],
    score: [state.score[0], state.score[1]],
    energy: [state.energy[0], state.energy[1]],
    history: state.history.slice(),
  };
}

/* ------------------------------------------------------------------ *
 * Helpers for UI / sim
 * ------------------------------------------------------------------ */

export function rc(state: GameState, cell: number): { r: number; c: number } {
  const size = state.config.size;
  return { r: Math.floor(cell / size), c: cell % size };
}

export function regionLabel(region: Region): string {
  return `${region.kind} ${region.index + 1}`;
}

/** The cell an action lands on (destination for a move). */
export function actionCell(action: Action): number {
  return action.type === "move" ? action.to : action.cell;
}

/** The cell most recently changed, or -1. */
export function lastTouchedCell(state: GameState): number {
  const h = state.history[state.history.length - 1];
  return h ? actionCell(h.action) : -1;
}

/** Who currently holds the most cells in a region (null = tied/empty),
 *  weighted by Otter and broken by Robin. Claimed regions return the owner. */
export function territoryHolder(
  state: GameState,
  region: Region,
): Player | null {
  if (region.claimedBy !== null) return region.claimedBy;
  let a = 0;
  let b = 0;
  let robinA = false;
  let robinB = false;
  for (const cell of region.cells) {
    if (!isActive(state, cell)) continue;
    const p = state.placedBy[cell];
    if (p !== 0 && p !== 1) continue;
    const animal = animalAt(state, cell);
    const w = animal?.territoryWeight ?? 1;
    if (p === 0) a += w;
    else b += w;
    if (animal?.breakTiesToOwner) {
      if (p === 0) robinA = true;
      else robinB = true;
    }
  }
  if (a > b) return 0;
  if (b > a) return 1;
  if (robinA && !robinB) return 0;
  if (robinB && !robinA) return 1;
  return null;
}

export function projectedScore(state: GameState): [number, number] {
  const s: [number, number] = [0, 0];
  for (const region of state.regions) {
    const h = territoryHolder(state, region);
    if (h !== null) s[h]++;
  }
  return s;
}
