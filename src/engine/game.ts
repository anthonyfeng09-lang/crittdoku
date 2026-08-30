import { ROSTER, CreatureDef } from "./creatures";
import {
  ABILITY_COST,
  Action,
  CreatureId,
  BoardConfig,
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
  Seed,
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
 * Creatures
 * ------------------------------------------------------------------ */

export function creatureFor(
  state: GameState,
  player: Player,
  digit: number,
): CreatureDef | null {
  const id = state.loadouts[player]?.[digit] as CreatureId | undefined;
  return id ? ROSTER[id] : null;
}

export function creatureAt(state: GameState, cell: number): CreatureDef | null {
  const digit = state.grid[cell];
  const by = state.placedBy[cell];
  if (digit === 0 || by < 0) return null;
  return creatureFor(state, by as Player, digit);
}

/** does this player's team include a creature with the given capability? */
export function teamHas(
  state: GameState,
  player: Player,
  flag: keyof CreatureDef,
): boolean {
  for (const id of Object.values(state.loadouts[player])) {
    if (ROSTER[id]?.[flag]) return true;
  }
  return false;
}

/** digits this player's team can use a given ability on */
function abilityDigits(
  state: GameState,
  player: Player,
  flag: keyof CreatureDef,
): number[] {
  const out: number[] = [];
  for (let d = 1; d <= state.config.size; d++) {
    if (creatureFor(state, player, d)?.[flag]) out.push(d);
  }
  return out;
}

export function mineCount(state: GameState, player: Player): number {
  let n = 0;
  for (let i = 0; i < state.mines.length; i++) if (state.mines[i] === player) n++;
  return n;
}

export const MAX_MINES = 3;

export function mineCost(state: GameState, player: Player): number {
  return teamHas(state, player, "cheapMines")
    ? Math.max(1, ABILITY_COST.mine - 2)
    : ABILITY_COST.mine;
}

/** how much each of this player's mines is worth toward territory */
function mineWeightFor(state: GameState, player: Player): number {
  let w = 1;
  for (const id of Object.values(state.loadouts[player])) {
    const mw = ROSTER[id]?.mineWeight;
    if (mw && mw > w) w = mw;
  }
  return w;
}

/** grid-occupied and not sleeping - counts toward completion and territory */
export function isActive(state: GameState, cell: number): boolean {
  return state.grid[cell] !== 0 && state.dormant[cell] === 0;
}

function isPermanent(state: GameState, cell: number): boolean {
  return creatureAt(state, cell)?.permanent === true;
}

/* ------------------------------------------------------------------ *
 * Game creation
 * ------------------------------------------------------------------ */

export interface CreateOptions {
  config?: BoardConfig;
  rules?: Partial<Rules>;
  seeds?: Seed[];
  firstPlayer?: Player;
  loadouts?: [Loadout, Loadout];
  startEnergy?: [number, number];
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
    mines: new Int8Array(g.cellCount).fill(-1),
    regrow: [],
    turn: 0,
    staleTurns: 0,
    current: opts.firstPlayer ?? 0,
    pendingExtra: false,
    score: [0, 0],
    energy: opts.startEnergy
      ? [opts.startEnergy[0], opts.startEnergy[1]]
      : [0, 0],
    status: "playing",
    endReason: null,
    winner: null,
    history: [],
  };

  for (const seed of opts.seeds ?? []) {
    if (!isLegal(state, seed.cell, seed.digit)) {
      throw new Error(`illegal seed: digit ${seed.digit} at cell ${seed.cell}`);
    }
    const owner = seed.owner ?? (-1 as Player);
    fillCell(state, seed.cell, seed.digit, owner, 0, 0, owner < 0);
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
  opts: { wild?: boolean; by?: Player } = {},
): boolean {
  if (digit < 1 || digit > state.config.size) return false;
  if (state.grid[cell] !== 0) return false;
  const mine = state.mines[cell];
  if (mine !== -1 && mine !== opts.by) return false;
  if (opts.wild) return true;
  const bit = 1 << digit;
  const base = cell * 3;
  if (state.regionMask[state.cellRegions[base + 0]] & bit) return false;
  if (state.regionMask[state.cellRegions[base + 1]] & bit) return false;
  if (state.regionMask[state.cellRegions[base + 2]] & bit) return false;
  return true;
}

/** normal placements only for the player to move (respects mines) */
export function legalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  if (state.status !== "playing") return moves;
  const { size } = state.config;
  const by = state.current;
  for (let cell = 0; cell < state.grid.length; cell++) {
    if (state.grid[cell] !== 0) continue;
    if (state.mines[cell] !== -1 && state.mines[cell] !== by) continue;
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

export function adjacentCells(
  state: GameState,
  cell: number,
  diagonal = false,
): number[] {
  const size = state.config.size;
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (!diagonal && dr !== 0 && dc !== 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
    }
  }
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

/** is `cell` in a region the given player is contesting? (gates Mole) */
function contestedBy(state: GameState, cell: number, player: Player): boolean {
  for (let k = 0; k < 3; k++) {
    const region = state.regions[state.cellRegions[cell * 3 + k]];
    if (region.claimedBy !== null) continue;
    if (region.filled === state.config.size - 1) return true;
    if (territoryHolder(state, region) === player) return true;
  }
  return false;
}

function canReplace(
  state: GameState,
  cell: number,
  digit: number,
  by: Player,
): boolean {
  if (creatureFor(state, by, digit)?.canMole !== true) return false;
  if (state.energy[by] < ABILITY_COST.replace) return false;
  const victim = state.placedBy[cell];
  if (victim !== other(by)) return false;
  if (isPermanent(state, cell)) return false;
  if (creatureAt(state, cell)?.regrowIfRemoved === true) return false;
  if (regionsClaimed(state, cell)) return false;
  if (!contestedBy(state, cell, victim as Player)) return false;
  const vbit = 1 << state.grid[cell];
  const bit = 1 << digit;
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[cell * 3 + k];
    let mask = state.regionMask[rid];
    if (state.grid[cell] !== digit) mask &= ~vbit;
    if (mask & bit) return false;
  }
  return true;
}

/** Every action available to the player to move. Used for the UI, bots and
 *  stuck detection. Ability actions are only listed when affordable. */
export function legalActions(state: GameState): Action[] {
  const out: Action[] = [];
  if (state.status !== "playing") return out;
  const by = state.current;
  const { size } = state.config;
  const energy = state.energy[by];

  const larkDigits =
    energy >= ABILITY_COST.wild ? abilityDigits(state, by, "canWild") : [];
  const moleDigits =
    energy >= ABILITY_COST.replace ? abilityDigits(state, by, "canMole") : [];
  const burstDigits =
    !state.pendingExtra && energy >= ABILITY_COST.extra
      ? abilityDigits(state, by, "canBurst")
      : [];
  const canMine =
    energy >= mineCost(state, by) &&
    mineCount(state, by) < MAX_MINES &&
    teamHas(state, by, "canMine");

  for (let cell = 0; cell < state.grid.length; cell++) {
    const empty = state.grid[cell] === 0;
    const mineHere = state.mines[cell];
    if (empty && mineHere === -1) {
      for (let d = 1; d <= size; d++) {
        if (isLegal(state, cell, d, { by })) {
          out.push({ type: "place", cell, digit: d });
          if (burstDigits.includes(d)) {
            out.push({ type: "place", cell, digit: d, burst: true });
          }
        }
      }
      if (larkDigits.length && !wouldComplete(state, cell)) {
        for (const d of larkDigits) {
          out.push({ type: "place", cell, digit: d, wild: true });
        }
      }
      if (canMine && !regionsClaimed(state, cell) && !wouldComplete(state, cell)) {
        out.push({ type: "mine", cell });
      }
    } else if (empty && mineHere === by) {
      for (let d = 1; d <= size; d++) {
        if (isLegal(state, cell, d, { by })) {
          out.push({ type: "place", cell, digit: d });
        }
      }
    } else if (empty && mineHere === other(by) && energy >= ABILITY_COST.clear) {
      out.push({ type: "clear", cell });
    } else if (moleDigits.length && state.placedBy[cell] === other(by)) {
      for (const d of moleDigits) {
        if (canReplace(state, cell, d, by)) {
          out.push({ type: "place", cell, digit: d });
        }
      }
    }
  }

  // hops
  if (energy >= ABILITY_COST.hop) {
    for (let cell = 0; cell < state.grid.length; cell++) {
      if (state.placedBy[cell] !== by || !isActive(state, cell)) continue;
      const cr = creatureAt(state, cell);
      if (cr?.moveAdjacent !== true) continue;
      if (regionsClaimed(state, cell)) continue;
      const digit = state.grid[cell];
      for (const to of adjacentCells(state, cell, cr.moveDiagonal === true)) {
        if (state.grid[to] !== 0 || state.mines[to] !== -1) continue;
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
  if (state.grid[to] !== 0 || state.mines[to] !== -1) return false;
  const bit = 1 << digit;
  const fromRegions = [
    state.cellRegions[from * 3 + 0],
    state.cellRegions[from * 3 + 1],
    state.cellRegions[from * 3 + 2],
  ];
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[to * 3 + k];
    let mask = state.regionMask[rid];
    if (fromRegions.includes(rid)) mask &= ~bit;
    if (mask & bit) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * Region / cell mutation
 * ------------------------------------------------------------------ */

function lockRegion(
  state: GameState,
  region: Region,
  by: Player,
  turn: number,
): boolean {
  if (region.claimedBy !== null || by < 0) return false;
  const opp = other(by);
  for (const cell of region.cells) {
    if (state.placedBy[cell] !== opp) continue;
    const cr = creatureAt(state, cell);
    if (cr && isActive(state, cell) && cr.denyOpponentLock) return false;
  }
  region.claimedBy = by;
  region.claimedOnTurn = turn;
  for (const cell of region.cells) {
    if (
      state.placedBy[cell] === opp &&
      isActive(state, cell) &&
      creatureAt(state, cell)?.energyOnOpponentLock === true
    ) {
      state.energy[opp] += 3;
    }
  }
  return true;
}

function fillCell(
  state: GameState,
  cell: number,
  digit: number,
  by: Player,
  dormantTurns: number,
  turn: number,
  seeded = false,
): number[] {
  state.grid[cell] = digit;
  state.placedBy[cell] = by;
  state.mines[cell] = -1; // placing consumes any mine on the cell
  if (seeded) state.seeded[cell] = true;
  if (dormantTurns > 0) {
    state.dormant[cell] = Math.max(1, state.turn + (dormantTurns - 1) * 2);
  }

  const bit = 1 << digit;
  const claimed: number[] = [];
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[cell * 3 + k];
    state.regionMask[rid] |= bit;
    if (dormantTurns > 0) continue;
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
  if (creatureAt(state, cell)?.claimRegionsOnWake) {
    for (let k = 0; k < 3; k++) {
      const region = state.regions[state.cellRegions[cell * 3 + k]];
      if (
        region.claimedBy === null &&
        territoryHolder(state, region) === by &&
        lockRegion(state, region, by, turn)
      ) {
        claimed.push(region.id);
      }
    }
  }
  return claimed;
}

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
    state.regionMask[rid] &= ~bit;
    if (!wasDormant) state.regions[rid].filled--;
  }
}

/* ------------------------------------------------------------------ *
 * Applying actions
 * ------------------------------------------------------------------ */

/** consecutive no-progress actions (hops, clears, replaces) that freeze the
 *  game so nobody can stall forever. Placing a digit or laying a mine counts
 *  as progress. */
export const STALE_LIMIT = 8;

export function applyMove(state: GameState, move: Move): GameState {
  return applyAction(state, { type: "place", cell: move.cell, digit: move.digit });
}

export function applyAction(state: GameState, action: Action): GameState {
  if (state.status !== "playing") throw new Error("game already ended");

  const by = state.current;
  state.turn++;
  let claimed: number[] = [];
  let replaced = false;
  let progressed = false;
  let burstDigit = 0;

  if (action.type === "mine") {
    const { cell } = action;
    const cost = mineCost(state, by);
    if (
      !teamHas(state, by, "canMine") ||
      state.energy[by] < cost ||
      mineCount(state, by) >= MAX_MINES ||
      state.grid[cell] !== 0 ||
      state.mines[cell] !== -1 ||
      regionsClaimed(state, cell) ||
      wouldComplete(state, cell)
    ) {
      throw new Error("illegal mine");
    }
    state.energy[by] -= cost;
    state.mines[cell] = by;
    progressed = true; // a mine is a board change, not a stall
  } else if (action.type === "clear") {
    const { cell } = action;
    if (
      state.mines[cell] !== other(by) ||
      state.energy[by] < ABILITY_COST.clear
    ) {
      throw new Error("illegal clear");
    }
    state.energy[by] -= ABILITY_COST.clear;
    state.energy[other(by)] += 2; // the mine-layer gets a little back
    state.mines[cell] = -1;
  } else if (action.type === "move") {
    const { from, to } = action;
    const digit = state.grid[from];
    const mover = creatureAt(state, from);
    if (
      state.energy[by] < ABILITY_COST.hop ||
      state.placedBy[from] !== by ||
      !isActive(state, from) ||
      mover?.moveAdjacent !== true ||
      regionsClaimed(state, from) ||
      !adjacentCells(state, from, mover.moveDiagonal === true).includes(to) ||
      !moveLegal(state, from, to, digit) ||
      wouldComplete(state, to)
    ) {
      throw new Error(`illegal move ${from} -> ${to}`);
    }
    state.energy[by] -= ABILITY_COST.hop;
    clearCell(state, from);
    claimed = fillCell(state, to, digit, by, 0, state.turn);
  } else {
    const { cell, digit } = action;
    if (action.wild) {
      if (
        creatureFor(state, by, digit)?.canWild !== true ||
        state.energy[by] < ABILITY_COST.wild ||
        state.grid[cell] !== 0 ||
        (state.mines[cell] !== -1 && state.mines[cell] !== by) ||
        wouldComplete(state, cell)
      ) {
        throw new Error("illegal wild placement");
      }
      state.energy[by] -= ABILITY_COST.wild;
      claimed = fillCell(state, cell, digit, by, 0, state.turn);
      progressed = true;
    } else if (state.grid[cell] !== 0) {
      if (!canReplace(state, cell, digit, by)) {
        throw new Error("illegal replacement");
      }
      state.energy[by] -= ABILITY_COST.replace;
      replaced = true;
      const victimDigit = state.grid[cell];
      const victimBy = state.placedBy[cell] as Player;
      const victimCreature = creatureFor(state, victimBy, victimDigit);
      clearCell(state, cell);
      if (victimCreature?.regrowIfRemoved) {
        state.regrow.push({
          cell,
          digit: victimDigit,
          owner: victimBy,
          at: state.turn,
        });
      }
      claimed = fillCell(state, cell, digit, by, 0, state.turn);
    } else {
      if (!isLegal(state, cell, digit, { by })) {
        throw new Error(`illegal move: digit ${digit} at cell ${cell}`);
      }
      const cr = creatureFor(state, by, digit);
      const dt = cr?.dormant ? (cr.dormantTurns ?? 1) : 0;
      claimed = fillCell(state, cell, digit, by, dt, state.turn);
      progressed = true;
      if (action.burst) {
        if (cr?.canBurst !== true || state.energy[by] < ABILITY_COST.extra) {
          throw new Error("illegal burst");
        }
        state.energy[by] -= ABILITY_COST.extra;
        burstDigit = digit;
      }
    }
    // placement energy: base + creature bonus (+ mine-scaling for Tallykit)
    state.energy[by] += ENERGY_PER_PLACE;
    const crHere = creatureFor(state, by, digit);
    if (crHere?.energyBonus) state.energy[by] += crHere.energyBonus;
    if (crHere?.minesScaleEnergy) {
      state.energy[by] += 2 * mineCount(state, by);
    }
  }

  for (const _rid of claimed) {
    state.score[by] += 1;
    state.energy[by] += ENERGY_PER_CLAIM;
  }

  const wasPendingExtra = state.pendingExtra;
  let grantedExtra = false;
  if (!wasPendingExtra && burstDigit > 0) {
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

  state.staleTurns = progressed ? 0 : state.staleTurns + 1;

  if (isGridFull(state)) return endGame(state, "grid-full", null);
  if (state.staleTurns >= STALE_LIMIT) {
    return endGame(state, "stalled", other(by));
  }

  if (grantedExtra) {
    if (hasAnyAction(state)) return state;
    state.pendingExtra = false;
  }
  if (wasPendingExtra) state.pendingExtra = false;

  state.current = other(by);
  beginTurn(state);
  return state;
}

function beginTurn(state: GameState): GameState {
  const p = state.current;

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

  state.regrow = state.regrow.filter((e) => {
    if (e.owner !== p || e.at >= state.turn) return true;
    if (state.grid[e.cell] === 0 && isLegal(state, e.cell, e.digit, { by: p })) {
      const claimed = fillCell(state, e.cell, e.digit, p, 0, state.turn);
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
    mines: state.mines.slice(),
    regrow: state.regrow.map((e) => ({ ...e })),
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

export function actionCell(action: Action): number {
  return action.type === "move" ? action.to : action.cell;
}

export function lastTouchedCell(state: GameState): number {
  const h = state.history[state.history.length - 1];
  return h ? actionCell(h.action) : -1;
}

/** Who currently holds the most of a region (null = tied/empty). Active
 *  cells count by their creature's weight; a mine counts as one held cell
 *  for its layer; Robin breaks ties. Claimed regions return the owner. */
export function territoryHolder(
  state: GameState,
  region: Region,
): Player | null {
  if (region.claimedBy !== null) return region.claimedBy;
  let a = 0;
  let b = 0;
  let robinA = false;
  let robinB = false;
  const mw0 = mineWeightFor(state, 0);
  const mw1 = mineWeightFor(state, 1);
  for (const cell of region.cells) {
    if (isActive(state, cell)) {
      const p = state.placedBy[cell];
      if (p !== 0 && p !== 1) continue;
      const cr = creatureAt(state, cell);
      const w = cr?.territoryWeight ?? 1;
      if (p === 0) a += w;
      else b += w;
      if (cr?.breakTiesToOwner) {
        if (p === 0) robinA = true;
        else robinB = true;
      }
    } else if (state.mines[cell] === 0) {
      a += mw0;
    } else if (state.mines[cell] === 1) {
      b += mw1;
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
