import {
  GameState,
  Move,
  isLegal,
  legalMoves,
} from "../engine";
import { RNG } from "../engine/rng";

export interface Bot {
  name: string;
  choose(state: GameState, rng: RNG): Move;
}

/** Uniformly random legal move. The neutral probe for structural bias. */
export const randomBot: Bot = {
  name: "random",
  choose(state, rng) {
    const moves = legalMoves(state);
    return rng.pick(moves);
  },
};

/** Count regions this move would complete right now (claim for mover). */
function claimGain(state: GameState, move: Move): number {
  let gain = 0;
  const size = state.config.size;
  for (let k = 0; k < 3; k++) {
    const region = state.regions[state.cellRegions[move.cell * 3 + k]];
    if (region.claimedBy === null && region.filled === size - 1) gain++;
  }
  return gain;
}

/** After `move`, how many regions are left with a single empty cell that
 *  the opponent could immediately claim? (a gift to the opponent) */
function opponentGifts(state: GameState, move: Move): number {
  const size = state.config.size;
  const bit = 1 << move.digit;
  // apply to masks/grid
  state.grid[move.cell] = move.digit;
  const touched: number[] = [];
  for (let k = 0; k < 3; k++) {
    const rid = state.cellRegions[move.cell * 3 + k];
    state.regionMask[rid] |= bit;
    state.regions[rid].filled++;
    touched.push(rid);
  }

  let gifts = 0;
  for (const rid of touched) {
    const region = state.regions[rid];
    if (region.claimedBy !== null || region.filled !== size - 1) continue;
    // find the one remaining empty cell in this region
    for (const cell of region.cells) {
      if (state.grid[cell] !== 0) continue;
      for (let d = 1; d <= size; d++) {
        if (isLegal(state, cell, d)) {
          gifts++;
          break;
        }
      }
      break;
    }
  }

  // undo
  state.grid[move.cell] = 0;
  for (const rid of touched) {
    state.regionMask[rid] &= ~bit;
    state.regions[rid].filled--;
  }
  return gifts;
}

/** Take claims when available; avoid handing the opponent a claim; else
 *  play randomly. A simple, legible opponent for playtesting. */
export const greedyBot: Bot = {
  name: "greedy",
  choose(state, rng) {
    const moves = legalMoves(state);
    let best: Move[] = [];
    let bestScore = -Infinity;
    for (const move of moves) {
      const gain = claimGain(state, move);
      const gifts = gain > 0 ? 0 : opponentGifts(state, move);
      const score = gain * 10 - gifts * 3;
      if (score > bestScore) {
        bestScore = score;
        best = [move];
      } else if (score === bestScore) {
        best.push(move);
      }
    }
    return rng.pick(best);
  },
};

export const bots: Record<string, Bot> = {
  random: randomBot,
  greedy: greedyBot,
};
