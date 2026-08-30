import { ALL_CREATURES, CreatureId, ROSTER } from "./creatures";
import { RNG } from "./rng";
import { Loadout, Player } from "./types";
import { loadoutFromIds } from "./creatures";

/** Snake pick order for two players drafting `teamSize` critters each from a
 *  shared pool: 0,1, 1,0, 0,1, 1,0, ...  Returns which player picks at each
 *  of the 2*teamSize steps. The player who picks 2nd in round 1 picks 1st in
 *  round 2, which is what keeps a shared-pool draft fair. */
export function snakeOrder(teamSize: number): Player[] {
  const order: Player[] = [];
  for (let round = 0; round < teamSize; round++) {
    const first: Player = (round % 2) as Player;
    order.push(first, first === 0 ? 1 : 0);
  }
  return order;
}

/** rough power ranking for the auto-drafter; higher = picked sooner */
const VALUE: Record<CreatureId, number> = {
  swiftwren: 9,
  digmole: 8,
  wildlark: 7,
  pricklehog: 7,
  shellclam: 6,
  acorncache: 6,
  mossback: 6,
  sunbeetle: 5,
  nutsquirrel: 5,
  barknewt: 5,
  boulderpup: 4,
  tumbleweed: 4,
  breezefinch: 4,
  fogkit: 3,
  snoozemouse: 3,
  slumberstone: 3,
  dozderling: 3,
  glidewing: 2,
};

export interface DraftResult {
  /** each player's picks, in the order they were taken */
  picks: [CreatureId[], CreatureId[]];
  loadouts: [Loadout, Loadout];
}

/** Auto-draft for bots / sim: greedy on VALUE with a little noise, then a
 *  random digit assignment. */
export function autoDraft(size: number, rng: RNG): DraftResult {
  const order = snakeOrder(size);
  const pool = new Set(ALL_CREATURES);
  const picks: [CreatureId[], CreatureId[]] = [[], []];

  for (const p of order) {
    const avail = [...pool];
    // pick the best available, but sometimes take the 2nd or 3rd best
    avail.sort((a, b) => VALUE[b] - VALUE[a] + (rng.next() - 0.5) * 3);
    const choice = avail[0];
    pool.delete(choice);
    picks[p].push(choice);
  }

  const assign = (ids: CreatureId[]): Loadout =>
    loadoutFromIds(rng.shuffle(ids.slice()), size);

  return {
    picks,
    loadouts: [assign(picks[0]), assign(picks[1])],
  };
}

/** category spread of a team, for UI hints */
export function categorySpread(ids: CreatureId[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const c = ROSTER[id].category;
    out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}
