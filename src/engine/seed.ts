import { createGame, isLegal, legalMoves } from "./game";
import { makeRng, RNG } from "./rng";
import { BoardConfig, Move } from "./types";

/** Produce `count` mutually-legal seed placements for a board. */
export function generateSeeds(
  config: BoardConfig,
  count: number,
  rng: RNG,
): Move[] {
  const probe = createGame({ config });
  const seeds: Move[] = [];
  let guard = 0;
  while (seeds.length < count && guard++ < count * 200) {
    const moves = legalMoves(probe);
    if (moves.length === 0) break;
    const m = rng.pick(moves);
    if (!isLegal(probe, m.cell, m.digit)) continue;
    // apply directly to the probe without turn/scoring machinery
    probe.grid[m.cell] = m.digit;
    for (let k = 0; k < 3; k++) {
      probe.regionMask[probe.cellRegions[m.cell * 3 + k]] |= 1 << m.digit;
      probe.regions[probe.cellRegions[m.cell * 3 + k]].filled++;
    }
    seeds.push(m);
  }
  return seeds;
}

/** A fixed seed layout for a config: deterministic, reused across matches. */
export function fixedSeeds(config: BoardConfig, count: number): Move[] {
  return generateSeeds(config, count, makeRng(0xf1ed ^ config.size));
}
