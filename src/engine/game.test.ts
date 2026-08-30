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
  projectedScore,
  territoryHolder,
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
  const playOut = (opts: Parameters<typeof createGame>[0]) => {
    const s = createGame(opts);
    let guard = 0;
    while (s.status === "playing" && guard++ < 40) applyMove(s, legalMoves(s)[0]);
    return s;
  };

  it('"sweep" rule: the player who still had a move takes every unclaimed region', () => {
    const s = playOut({ config: CONFIG_6x6, rules: { endScoring: "sweep" } });
    expect(s.status).toBe("ended");
    expect(s.regions.every((r) => r.claimedBy !== null)).toBe(true);
    expect(s.score[0] + s.score[1]).toBe(s.regions.length);
  });

  it('"majority" rule (default): unclaimed regions go to the cell-count leader, ties to nobody', () => {
    const s = playOut({ config: CONFIG_6x6 });
    expect(s.rules.endScoring).toBe("majority");
    expect(s.status).toBe("ended");
    // score matches the sum of per-region territory holders
    const proj = s.regions.reduce(
      (acc, r) => {
        const h = territoryHolder(s, r);
        if (h !== null) acc[h]++;
        return acc;
      },
      [0, 0],
    );
    expect(s.score).toEqual(proj);
  });

  it('"keep" rule: only regions claimed in play score', () => {
    const s = playOut({ config: CONFIG_6x6, rules: { endScoring: "keep" } });
    const claimedInPlay = s.regions.filter(
      (r) => r.claimedBy !== null && r.filled === s.config.size,
    ).length;
    expect(s.score[0] + s.score[1]).toBe(claimedInPlay);
  });

  it("winner is whoever holds more regions (ties broken by locked regions, then energy)", () => {
    const s = playOut({ config: CONFIG_6x6 });
    expect(s.winner).not.toBeNull();
    if (s.winner === "draw" || s.winner === null) {
      expect(s.score[0]).toBe(s.score[1]);
    } else {
      expect(s.score[s.winner]).toBeGreaterThanOrEqual(s.score[1 - s.winner]);
    }
  });

  it("rejects moves after the game has ended", () => {
    const s = playOut({ config: CONFIG_6x6 });
    expect(() => applyMove(s, { cell: 0, digit: 1 })).toThrow();
  });
});

describe("territory", () => {
  it("projectedScore tracks live territory before the freeze", () => {
    const s = createGame();
    applyMove(s, { cell: cell(0, 0), digit: 1 }); // p0 in row 0
    applyMove(s, { cell: cell(0, 1), digit: 2 }); // p1 in row 0
    applyMove(s, { cell: cell(0, 2), digit: 3 }); // p0 in row 0 -> p0 leads row 0
    const row0 = s.regions.find((r) => r.kind === "row" && r.index === 0)!;
    expect(territoryHolder(s, row0)).toBe(0);
    const proj = projectedScore(s);
    expect(proj[0]).toBeGreaterThan(proj[1]);
  });
});

describe("legalMoves", () => {
  it("empty 9x9 board has 81*9 legal moves", () => {
    const s = createGame();
    expect(legalMoves(s).length).toBe(81 * 9);
    expect(hasLegalMove(s)).toBe(true);
  });
});
