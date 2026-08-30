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

/** Mild draft preferences for the auto-drafter (from self-play win rates,
 *  post M4-balance). Deliberately flat: real drafts are close, and a steep
 *  greedy model makes the snake draft look unfair when it mostly isn't. */
const VALUE_OVERRIDES: Partial<Record<CreatureId, number>> = {
  mossback: 3,
  digmole: 3,
  pricklehog: 3,
  acorncache: 3,
};
const value = (id: CreatureId) => VALUE_OVERRIDES[id] ?? 2;

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
    // mild preference + large noise: bots draft plausibly, not identically
    avail.sort((a, b) => value(b) - value(a) + (rng.next() - 0.5) * 6);
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
