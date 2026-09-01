import {
  Action,
  GameState,
  Move,
  Player,
  applyAction,
  cloneState,
  legalActions,
  legalMoves,
  projectedScore,
} from "../engine";
import { RNG } from "../engine/rng";

export interface Bot {
  name: string;
  choose(state: GameState, rng: RNG): Action;
}

function argmaxRandom<T>(items: T[], score: (x: T) => number, rng: RNG): T {
  let best: T[] = [];
  let bestScore = -Infinity;
  for (const x of items) {
    const sc = score(x);
    if (sc > bestScore) {
      bestScore = sc;
      best = [x];
    } else if (sc === bestScore) {
      best.push(x);
    }
  }
  return rng.pick(best);
}

const asPlace = (m: Move): Action => ({
  type: "place",
  cell: m.cell,
  digit: m.digit,
});

/* ------------------------------------------------------------------ *
 * milestone 1/2 bots - normal placements only, no ability use
 * ------------------------------------------------------------------ */

export const randomBot: Bot = {
  name: "random",
  choose: (state, rng) => {
    const m = legalMoves(state);
    return m.length ? asPlace(rng.pick(m)) : rng.pick(legalActions(state));
  },
};

/** uniformly random over EVERY legal action (incl. abilities) */
export const randomActionBot: Bot = {
  name: "random+",
  choose: (state, rng) => rng.pick(legalActions(state)),
};

function claimGain(state: GameState, cell: number): number {
  let gain = 0;
  const size = state.config.size;
  for (let k = 0; k < 3; k++) {
    const region = state.regions[state.cellRegions[cell * 3 + k]];
    if (region.claimedBy === null && region.filled === size - 1) gain++;
  }
  return gain;
}

/** cheap frozen-now territory delta for a normal placement, via mask toggle */
function placeTerritoryDelta(state: GameState, m: Move, me: Player): number {
  const base = projectedScore(state);
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
  return after[me] - after[1 - me] - (base[me] - base[1 - me]);
}

export const territoryBot: Bot = {
  name: "territory",
  choose(state, rng) {
    const me = state.current as Player;
    const moves = legalMoves(state);
    if (moves.length === 0) return rng.pick(legalActions(state));
    return asPlace(
      argmaxRandom(
        moves,
        (m) => placeTerritoryDelta(state, m, me) * 4 + claimGain(state, m.cell),
        rng,
      ),
    );
  },
};

/* ------------------------------------------------------------------ *
 * critter bots - play the full action set incl. critter abilities
 * ------------------------------------------------------------------ */

/** cheap pre-score used to shortlist actions before deep evaluation */
function cheapActionScore(state: GameState, a: Action, me: Player): number {
  if (a.type === "move") return 0.5; // hops rarely worth it
  if (a.type === "mine") return 0.4;
  if (a.type === "clear") return 0.3;
  if (a.wild) return 1; // save the wild unless deep-eval loves it
  const m: Move = { cell: a.cell, digit: a.digit };
  const isReplace = state.grid[a.cell] !== 0;
  let v = placeTerritoryDelta(state, m, me) * 4 + claimGain(state, a.cell);
  if (isReplace) v += 1;
  if (a.burst) v += 0.5;
  return v;
}

function positionScore(state: GameState, me: Player): number {
  const s = projectedScore(state);
  let v = (s[me] - s[1 - me]) * 5;
  if (state.status === "ended")
    v += state.winner === me ? 12 : state.winner === "draw" ? 0 : -12;
  return v;
}

function shortlist(state: GameState, me: Player, n: number): Action[] {
  const actions = legalActions(state);
  return actions
    .map((a) => ({ a, c: cheapActionScore(state, a, me) }))
    .sort((x, y) => y.c - x.c)
    .slice(0, n)
    .map((x) => x.a);
}

export const critterBot: Bot = {
  name: "critter",
  choose(state, rng) {
    const me = state.current as Player;
    const list = shortlist(state, me, 6);
    const all = legalActions(state);
    if (all.length > list.length) list.push(rng.pick(all));
    const base = projectedScore(state);
    return argmaxRandom(
      list,
      (a) => {
        let next: GameState;
        try {
          next = cloneState(state);
          applyAction(next, a);
        } catch {
          return -Infinity;
        }
        const after = projectedScore(next);
        let v = (after[me] - after[1 - me]) * 5 - (base[me] - base[1 - me]) * 5;
        if (next.status === "ended")
          v += next.winner === me ? 8 : next.winner === "draw" ? 0 : -8;
        else if (next.current === me) v += 1.5; // kept the turn
        return v - (a.type === "move" ? 0.3 : 0);
      },
      rng,
    );
  },
};

/** two-ply: assume the opponent then plays their best shortlisted reply */
export const fierceBot: Bot = {
  name: "fierce",
  choose(state, rng) {
    const me = state.current as Player;
    const opp = (1 - me) as Player;
    const list = shortlist(state, me, 5);
    if (list.length === 0) return rng.pick(legalActions(state));
    return argmaxRandom(
      list,
      (a) => {
        let n1: GameState;
        try {
          n1 = cloneState(state);
          applyAction(n1, a);
        } catch {
          return -Infinity;
        }
        if (n1.status === "ended") return positionScore(n1, me);
        if (n1.current === me) return positionScore(n1, me) + 1.2;
        let worst = Infinity;
        for (const oa of shortlist(n1, opp, 6)) {
          let n2: GameState;
          try {
            n2 = cloneState(n1);
            applyAction(n2, oa);
          } catch {
            continue;
          }
          const e = positionScore(n2, me);
          if (e < worst) worst = e;
        }
        return worst === Infinity ? positionScore(n1, me) : worst;
      },
      rng,
    );
  },
};

export const bots: Record<string, Bot> = {
  random: randomBot,
  "random+": randomActionBot,
  territory: territoryBot,
  critter: critterBot,
  fierce: fierceBot,
};
