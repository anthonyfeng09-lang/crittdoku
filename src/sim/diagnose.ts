import {
  CONFIG_9x9,
  applyMove,
  createGame,
  legalMoves,
} from "../engine";
import { makeRng } from "../engine/rng";

// Sanity-check the "stuck" finding: play random games, then brute-force
// verify that at the end NO empty cell can take ANY digit.
for (let g = 0; g < 12; g++) {
  const rng = makeRng(1000 + g);
  const s = createGame({ config: CONFIG_9x9, firstPlayer: 0 });
  let plies = 0;
  while (s.status === "playing") {
    const moves = legalMoves(s);
    if (moves.length === 0) break;
    applyMove(s, rng.pick(moves));
    plies++;
  }
  let empty = 0;
  for (let i = 0; i < s.grid.length; i++) if (s.grid[i] === 0) empty++;

  // brute check every empty cell / digit against a fresh scan of row/col/box
  const size = 9;
  let anyPlayable = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (s.grid[r * size + c] !== 0) continue;
      for (let d = 1; d <= 9; d++) {
        let ok = true;
        for (let k = 0; k < size; k++) {
          if (s.grid[r * size + k] === d) ok = false;
          if (s.grid[k * size + c] === d) ok = false;
        }
        const br = Math.floor(r / 3) * 3;
        const bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++)
            if (s.grid[(br + i) * size + (bc + j)] === d) ok = false;
        if (ok) anyPlayable++;
      }
    }
  }

  console.log(
    `game ${g}: end=${s.endReason} plies=${plies} empty=${empty} ` +
      `brute-playable=${anyPlayable} score=${s.score.join("-")} ` +
      `winner=${s.winner} lastBy=${s.history.at(-1)?.by}`,
  );
}
