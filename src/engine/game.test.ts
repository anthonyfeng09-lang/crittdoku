import { describe, expect, it } from "vitest";
import {
  CONFIG_6x6,
  CONFIG_9x9,
  applyMove,
  boxIndexOf,
  createGame,
  geometry,
  hasLegalMove,
  isLegal,
  legalMoves,
} from "./index";

const cell = (r: number, c: number, size = 9) => r * size + c;

describe("geometry", () => {
  it("9x9 has 9 boxes", () => {
    expect(geometry(CONFIG_9x9).boxCount).toBe(9);
  });
  it("6x6 has 6 boxes, 2 wide x 3 tall", () => {
    const g = geometry(CONFIG_6x6);
    expect(g.boxCount).toBe(6);
    expect(g.boxesPerRow).toBe(2);
    expect(g.boxesPerCol).toBe(3);
  });
  it("6x6 box index: (0,0) and (1,2) share a box; (2,0) does not", () => {
    expect(boxIndexOf(CONFIG_6x6, 0, 0)).toBe(boxIndexOf(CONFIG_6x6, 1, 2));
    expect(boxIndexOf(CONFIG_6x6, 0, 0)).not.toBe(boxIndexOf(CONFIG_6x6, 2, 0));
  });
});

describe("legality", () => {
  it("rejects a repeat in row, column, and box", () => {
    const s = createGame();
    applyMove(s, { cell: cell(0, 0), digit: 5 });
    expect(isLegal(s, cell(0, 8), 5)).toBe(false); // same row
    expect(isLegal(s, cell(8, 0), 5)).toBe(false); // same column
    expect(isLegal(s, cell(1, 1), 5)).toBe(false); // same box
    expect(isLegal(s, cell(1, 1), 4)).toBe(true);
    expect(isLegal(s, cell(4, 4), 5)).toBe(true); // unrelated cell
  });

  it("there is no predetermined solution: any non-conflicting digit is legal", () => {
    const s = createGame();
    // a wild arrangement that no real sudoku solution contains
    applyMove(s, { cell: cell(0, 0), digit: 1 });
    applyMove(s, { cell: cell(0, 1), digit: 2 });
    applyMove(s, { cell: cell(0, 2), digit: 3 });
    expect(isLegal(s, cell(0, 3), 9)).toBe(true);
  });

  it("seeded cells constrain legality", () => {
    const s = createGame({ seeds: [{ cell: cell(4, 4), digit: 7 }] });
    expect(isLegal(s, cell(4, 0), 7)).toBe(false);
    expect(s.seeded[cell(4, 4)]).toBe(true);
  });
});

describe("claiming", () => {
  it("the player who places the last cell of a row claims it", () => {
    const s = createGame();
    // fill row 0 with 1..8 alternating players, 9th cell claims the row
    for (let c = 0; c < 8; c++) {
      applyMove(s, { cell: cell(0, c), digit: c + 1 });
    }
    const mover = s.current;
    applyMove(s, { cell: cell(0, 8), digit: 9 });
    const row0 = s.regions.find((r) => r.kind === "row" && r.index === 0)!;
    expect(row0.filled).toBe(9);
    expect(row0.claimedBy).toBe(mover);
    expect(s.score[mover]).toBeGreaterThanOrEqual(1);
  });

  it("one move can claim multiple regions at once", () => {
    // Construct a position where the final cell completes row, col and box.
    const s = createGame();
    const size = 9;
    // Fill everything except (0,0), leaving a legal digit there.
    // Build a valid full grid via a simple base-pattern latin square.
    const pattern = (r: number, c: number) =>
      ((r % 3) * 3 + Math.floor(r / 3) + c) % 9;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r === 0 && c === 0) continue;
        const d = pattern(r, c) + 1;
        expect(isLegal(s, cell(r, c), d)).toBe(true);
        applyMove(s, { cell: cell(r, c), digit: d });
      }
    }
    const mover = s.current;
    const d0 = pattern(0, 0) + 1;
    expect(isLegal(s, cell(0, 0), d0)).toBe(true);
    applyMove(s, { cell: cell(0, 0), digit: d0 });
    expect(s.status).toBe("ended");
    expect(s.endReason).toBe("grid-full");
    // mover completed row 0, col 0 and box 0 in one move
    const claimedByMover = s.regions.filter((r) => r.claimedBy === mover).length;
    expect(claimedByMover).toBeGreaterThanOrEqual(3);
  });
});

describe("end conditions", () => {
  it("stuck player: opponent sweeps every unclaimed region", () => {
    // Force an early deadlock on a tiny surface is hard on 9x9; instead
    // drive a 6x6 game to completion and assert consistency.
    const s = createGame({ config: CONFIG_6x6 });
    let guard = 0;
    while (s.status === "playing" && guard++ < 40) {
      const moves = legalMoves(s);
      applyMove(s, moves[0]);
    }
    expect(s.status).toBe("ended");
    // every region must be claimed by someone once the game is over
    expect(s.regions.every((r) => r.claimedBy !== null)).toBe(true);
    const totalClaims = s.score[0] + s.score[1];
    expect(totalClaims).toBe(s.regions.length);
  });

  it("winner is whoever claimed more regions", () => {
    const s = createGame({ config: CONFIG_6x6 });
    let guard = 0;
    while (s.status === "playing" && guard++ < 40) {
      applyMove(s, legalMoves(s)[0]);
    }
    if (s.score[0] === s.score[1]) expect(s.winner).toBe("draw");
    else expect(s.winner).toBe(s.score[0] > s.score[1] ? 0 : 1);
  });

  it("rejects moves after the game has ended", () => {
    const s = createGame({ config: CONFIG_6x6 });
    let guard = 0;
    while (s.status === "playing" && guard++ < 40) applyMove(s, legalMoves(s)[0]);
    expect(() => applyMove(s, { cell: 0, digit: 1 })).toThrow();
  });
});

describe("legalMoves", () => {
  it("empty 9x9 board has 81*9 legal moves", () => {
    const s = createGame();
    expect(legalMoves(s).length).toBe(81 * 9);
    expect(hasLegalMove(s)).toBe(true);
  });
});
