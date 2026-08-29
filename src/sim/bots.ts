import {
  GameState,
  Move,
  Player,
  cloneState,
  applyMove,
  isLegal,
  legalMoves,
  projectedScore,
} from "../engine";
import { RNG } from "../engine/rng";

export interface Bot {
  name: string;
  choose(state: GameState, rng: RNG): Move;
}

function argmaxRandom(
  moves: Move[],
  score: (m: Move) => number,
  rng: RNG,
): Move {
  let best: Move[] = [];
  let bestScore = -Infinity;
  for (const m of moves) {
    const sc = score(m);
    if (sc > bestScore) {
      bestScore = sc;
      best = [m];
    } else if (sc === bestScore) {
      best.push(m);
    }
  }
  return rng.pick(best);
}

/** Uniformly random legal move. The neutral probe for structural bias. */
export const randomBot: Bot = {
  name: "random",
  choose(state, rng) {
    return rng.pick(legalMoves(state));
  },
};

/** Count regions this move would complete right now (claim + lock). */
function claimGain(state: GameState, move: Move): number {
  let gain = 0;
  const size = state.config.size;
  for (let k = 0; k < 3; k++) {
    const region = state.regions[state.cellRegions[move.cell * 3 + k]];
    if (region.claimedBy === null && region.filled === size - 1) gain++;
  }
  return gain;
}

/** Territory-greedy: pick the move that most improves my frozen-now score,
 *  with a nudge toward completing (locking) regions. A legible opponent. */
export const territoryBot: Bot = {
  name: "territory",
  choose(state, rng) {
    const me = state.current as Player;
    const moves = legalMoves(state);
    const base = projectedScore(state);
    return argmaxRandom(
      moves,
      (m) => {
        const bit = 1 << m.digit;
        state.grid[m.cell] = m.digit;
        const touched: number[] = [];
        for (let k = 0; k < 3; k++) {
          const rid = state.cellRegions[m.cell * 3 + k];
          state.regionMask[rid] |= bit;
          state.regions[rid].filled++;
          state.placedBy[m.cell] = me;
          touched.push(rid);
        }
        const after = projectedScore(state);
        state.grid[m.cell] = 0;
        state.placedBy[m.cell] = -1;
        for (const rid of touched) {
          state.regionMask[rid] &= ~bit;
          state.regions[rid].filled--;
        }
        const mine = after[me] - base[me];
        const theirs = after[1 - me] - base[1 - me];
        return (mine - theirs) * 4 + claimGain(state, m);
      },
      rng,
    );
  },
};

/** Territory value first, then — among the few best territory moves — the
 *  one that keeps the board most alive. A deadlock hands the tempo (and the
 *  final placement) to the opponent, so a bot that can choose *when* to
 *  freeze is the interesting skill test. Shortlists to stay cheap. */
export const mobilityBot: Bot = {
  name: "mobility",
  choose(state, rng) {
    const me = state.current as Player;
    const base = projectedScore(state);
    const scored = legalMoves(state).map((m) => {
      const bit = 1 << m.digit;
      state.grid[m.cell] = m.digit;
      state.placedBy[m.cell] = me;
      const touched: number[] = [];
      for (let k = 0; k < 3; k++) {
        const rid = state.cellRegions[m.cell * 3 + k];
        state.regionMask[rid] |= bit;
        state.regions[rid].filled++;
        touched.push(rid);
      }
      const after = projectedScore(state);
      state.grid[m.cell] = 0;
      state.placedBy[m.cell] = -1;
      for (const rid of touched) {
        state.regionMask[rid] &= ~bit;
        state.regions[rid].filled--;
      }
      const terr = after[me] - after[1 - me] - (base[me] - base[1 - me]);
      return { m, v: terr * 4 + claimGain(state, m) };
    });
    scored.sort((x, y) => y.v - x.v);
    const shortlist = scored.slice(0, 8);

    return argmaxRandom(
      shortlist.map((s) => s.m),
      (m) => {
        const idx = shortlist.findIndex((s) => s.m === m);
        const next = cloneState(state);
        applyMove(next, m);
        // if this move ends the game, is it in my favour?
        if (next.status === "ended") {
          return shortlist[idx].v + (next.winner === me ? 6 : -6);
        }
        const mine = legalMoves(next).length; // board-alive proxy
        return shortlist[idx].v + Math.min(mine, 200) * 0.02;
      },
      rng,
    );
  },
};

/** Legacy greedy (completion-focused). Kept for comparison with v1 rules. */
export const greedyBot: Bot = {
  name: "greedy",
  choose(state, rng) {
    const moves = legalMoves(state);
    return argmaxRandom(
      moves,
      (m) => {
        const gain = claimGain(state, m);
        if (gain > 0) return gain * 10;
        // avoid handing the opponent a lone-empty-cell region
        const bit = 1 << m.digit;
        state.grid[m.cell] = m.digit;
        const touched: number[] = [];
        for (let k = 0; k < 3; k++) {
          const rid = state.cellRegions[m.cell * 3 + k];
          state.regionMask[rid] |= bit;
          state.regions[rid].filled++;
          touched.push(rid);
        }
        let gifts = 0;
        const size = state.config.size;
        for (const rid of touched) {
          const region = state.regions[rid];
          if (region.claimedBy !== null || region.filled !== size - 1) continue;
          for (const c of region.cells) {
            if (state.grid[c] !== 0) continue;
            for (let d = 1; d <= size; d++) {
              if (isLegal(state, c, d)) {
                gifts++;
                break;
              }
            }
            break;
          }
        }
        state.grid[m.cell] = 0;
        for (const rid of touched) {
          state.regionMask[rid] &= ~bit;
          state.regions[rid].filled--;
        }
        return -gifts * 3;
      },
      rng,
    );
  },
};

export const bots: Record<string, Bot> = {
  random: randomBot,
  greedy: greedyBot,
  territory: territoryBot,
  mobility: mobilityBot,
};
