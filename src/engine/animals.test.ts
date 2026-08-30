import { describe, expect, it } from "vitest";
import {
  AnimalId,
  Loadout,
  applyAction,
  createGame,
  legalActions,
  loadoutFrom,
  makeRng,
  randomLoadout,
  territoryHolder,
} from "./index";

const SIZE = 9;
const cell = (r: number, c: number) => r * SIZE + c;

/** filler animal is Robin: inert except for freeze-time ties, and ties
 *  cancel when both sides hold one, so it never skews a mid-game test. */
function lo(overrides: Record<number, AnimalId>): Loadout {
  const ids: AnimalId[] = Array(SIZE).fill("robin");
  for (const [d, a] of Object.entries(overrides)) ids[Number(d) - 1] = a;
  return loadoutFrom(ids, SIZE);
}

const place = (c: number, d: number, wild = false) =>
  ({ type: "place", cell: c, digit: d, wild }) as const;

function rowOf(s: ReturnType<typeof createGame>, index: number) {
  return s.regions.find((r) => r.kind === "row" && r.index === index)!;
}

/** advance the turn with a legal placement isolated in box 8 (rows/cols 6–8),
 *  well clear of where the tests act */
function pass(s: ReturnType<typeof createGame>) {
  const m = legalActions(s).find((a) => {
    if (a.type !== "place" || a.wild) return false;
    return Math.floor(a.cell / SIZE) >= 6 && a.cell % SIZE >= 6;
  });
  if (!m) throw new Error("no filler move available");
  applyAction(s, m);
}

describe("Squirrel — energy on placement", () => {
  it("grants its bonus on top of the base", () => {
    const s = createGame({ loadouts: [lo({ 5: "squirrel" }), lo({})] });
    applyAction(s, place(cell(0, 0), 5));
    expect(s.energy[0]).toBe(1 + 2);
  });
});

describe("Wren — extra placement", () => {
  it("keeps the turn, then passes after the extra, once per match", () => {
    const s = createGame({ loadouts: [lo({ 3: "wren" }), lo({})] });
    applyAction(s, place(cell(0, 0), 3));
    expect(s.current).toBe(0);
    expect(s.pendingExtra).toBe(true);
    applyAction(s, place(cell(1, 1), 1)); // the extra placement
    expect(s.current).toBe(1);
    expect(s.charges[0].wren).toBe(false);
    expect(s.skipNext[0]).toBe(true);

    pass(s); // p1's turn
    expect(s.current).toBe(1); // p0's turn was forfeited — still Clay
    expect(s.skipNext[0]).toBe(false);
    pass(s); // p1 again
    expect(s.current).toBe(0); // now Sage plays
  });
});

describe("Hedgehog — denies the opponent's lock", () => {
  it("a completed region with your Hedgehog cell stays unclaimed", () => {
    const s = createGame({ loadouts: [lo({}), lo({ 7: "hedgehog" })] });
    const seq: Array<[number, number]> = [
      [cell(0, 0), 1],
      [cell(0, 1), 2],
      [cell(0, 2), 3],
      [cell(0, 3), 7], // p1 hedgehog
      [cell(0, 4), 4],
      [cell(0, 5), 5],
      [cell(0, 6), 6],
      [cell(0, 7), 8],
      [cell(0, 8), 9], // p0 completes row 0
    ];
    for (const [c, d] of seq) applyAction(s, place(c, d));
    const row0 = rowOf(s, 0);
    expect(row0.filled).toBe(9);
    expect(row0.claimedBy).toBeNull();
    expect(s.score[0]).toBe(0);
  });
});

describe("Tortoise / Newt / Mole — removal", () => {
  it("Mole replaces an opponent's ordinary digit, once per match", () => {
    const s = createGame({
      loadouts: [lo({ 9: "mole" }), lo({ 2: "squirrel" })],
    });
    applyAction(s, place(cell(5, 0), 1)); // p0
    applyAction(s, place(cell(1, 1), 2)); // p1, ordinary
    pass(s); // p0
    pass(s); // p1
    applyAction(s, place(cell(1, 1), 9)); // p0 mole-replaces (1,1)
    expect(s.grid[cell(1, 1)]).toBe(9);
    expect(s.placedBy[cell(1, 1)]).toBe(0);
    expect(s.charges[0].mole).toBe(false);
    expect(s.history[s.history.length - 1].replaced).toBe(true);
  });

  it("Mole cannot take a Tortoise (permanent) or a Newt", () => {
    const s = createGame({
      loadouts: [lo({ 9: "mole" }), lo({ 1: "tortoise", 4: "newt" })],
    });
    pass(s); // p0
    applyAction(s, place(cell(1, 0), 1)); // p1 tortoise
    pass(s); // p0
    applyAction(s, place(cell(2, 0), 4)); // p1 newt
    expect(() => applyAction(s, place(cell(1, 0), 9))).toThrow();
    expect(() => applyAction(s, place(cell(2, 0), 9))).toThrow();
  });
});

describe("Dormouse — delayed contribution", () => {
  it("does not complete a region until the placer's next turn", () => {
    const s = createGame({ loadouts: [lo({ 6: "dormouse" }), lo({})] });
    const fill: Array<[number, number]> = [
      [cell(0, 0), 1],
      [cell(0, 1), 2],
      [cell(0, 2), 3],
      [cell(0, 3), 4],
      [cell(0, 4), 5],
      [cell(0, 5), 7],
      [cell(0, 6), 8],
      [cell(0, 7), 9],
    ];
    for (const [c, d] of fill) applyAction(s, place(c, d));
    // p0 to move; completes row 0 with its Dormouse 6
    applyAction(s, place(cell(0, 8), 6));
    const row0 = rowOf(s, 0);
    expect(row0.filled).toBe(8);
    expect(row0.claimedBy).toBeNull();
    expect(s.dormant[cell(0, 8)]).toBeGreaterThan(0);

    applyAction(s, place(cell(1, 0), 4)); // p1 elsewhere
    // beginTurn(0) has now woken the Dormouse
    expect(row0.filled).toBe(9);
    expect(row0.claimedBy).toBe(0);
    expect(s.score[0]).toBe(1);
  });
});

describe("Robin — tie-break", () => {
  it("a tied region you hold a Robin cell in settles to you", () => {
    const s = createGame({
      loadouts: [lo({ 1: "robin" }), lo({ 2: "squirrel" })],
    });
    applyAction(s, place(cell(0, 0), 1)); // p0 robin
    applyAction(s, place(cell(0, 1), 2)); // p1
    const row0 = rowOf(s, 0);
    expect(row0.filled).toBe(2);
    expect(territoryHolder(s, row0)).toBe(0);
  });
});

describe("Otter — double territory weight", () => {
  it("outweighs a single ordinary opponent cell", () => {
    const withOtter = createGame({
      loadouts: [lo({ 1: "otter" }), lo({ 2: "squirrel" })],
    });
    applyAction(withOtter, place(cell(0, 0), 1)); // p0 otter (weight 2)
    applyAction(withOtter, place(cell(0, 1), 2)); // p1 (weight 1)
    expect(territoryHolder(withOtter, rowOf(withOtter, 0))).toBe(0);

    const control = createGame({
      loadouts: [lo({ 1: "squirrel" }), lo({ 2: "squirrel" })],
    });
    applyAction(control, place(cell(0, 0), 1));
    applyAction(control, place(cell(0, 1), 2));
    expect(territoryHolder(control, rowOf(control, 0))).toBeNull();
  });
});

describe("Lark — wild placement", () => {
  it("ignores the row/column/box rule, once per match", () => {
    const s = createGame({ loadouts: [lo({ 5: "lark" }), lo({})] });
    applyAction(s, place(cell(0, 0), 5)); // p0 ordinary
    pass(s); // p1
    applyAction(s, place(cell(0, 1), 5, true)); // p0 wild: 2nd 5 in row 0
    expect(s.grid[cell(0, 1)]).toBe(5);
    expect(s.charges[0].lark).toBe(false);

    pass(s); // p1
    expect(() => applyAction(s, place(cell(0, 2), 5, true))).toThrow();
  });
});

describe("Sparrow — hop", () => {
  it("moves one of its cells to an adjacent empty legal cell and passes the turn", () => {
    const s = createGame({ loadouts: [lo({ 3: "sparrow" }), lo({})] });
    applyAction(s, place(cell(4, 4), 3)); // p0
    pass(s); // p1
    applyAction(s, { type: "move", from: cell(4, 4), to: cell(4, 5) });
    expect(s.grid[cell(4, 4)]).toBe(0);
    expect(s.grid[cell(4, 5)]).toBe(3);
    expect(s.placedBy[cell(4, 5)]).toBe(0);
    expect(s.current).toBe(1);
  });
});

describe("ability limits (milestone 3a nerfs)", () => {
  it("Sparrow has only two hops per match", () => {
    const s = createGame({ loadouts: [lo({ 3: "sparrow" }), lo({})] });
    applyAction(s, place(cell(4, 4), 3));
    expect(s.charges[0].hops).toBe(2);
    pass(s);
    applyAction(s, { type: "move", from: cell(4, 4), to: cell(4, 5) });
    expect(s.charges[0].hops).toBe(1);
    pass(s);
    applyAction(s, { type: "move", from: cell(4, 5), to: cell(4, 6) });
    expect(s.charges[0].hops).toBe(0);
    pass(s);
    expect(() =>
      applyAction(s, { type: "move", from: cell(4, 6), to: cell(4, 7) }),
    ).toThrow();
  });

  it("Lark's wild placement cannot be the cell that completes a region", () => {
    const s = createGame({ loadouts: [lo({ 5: "lark" }), lo({})] });
    const fill: Array<[number, number]> = [
      [cell(0, 0), 1],
      [cell(0, 1), 2],
      [cell(0, 2), 3],
      [cell(0, 3), 4],
      [cell(0, 4), 6],
      [cell(0, 5), 7],
      [cell(0, 6), 8],
      [cell(0, 7), 9],
    ];
    for (const [c, d] of fill) applyAction(s, place(c, d));
    // (0,8) is the last empty cell of row 0 — a wild 5 there would complete it
    expect(() => applyAction(s, place(cell(0, 8), 5, true))).toThrow();
  });

  it("Mole cannot take a cell in a region nobody is contesting", () => {
    const s = createGame({
      loadouts: [lo({ 9: "mole" }), lo({ 2: "squirrel" })],
    });
    applyAction(s, place(cell(1, 1), 1)); // p0, box 0
    applyAction(s, place(cell(2, 2), 2)); // p1's lone digit
    applyAction(s, place(cell(2, 0), 3)); // p0 ties row 2
    pass(s); // p1
    applyAction(s, place(cell(0, 2), 4)); // p0 ties col 2, leads box 0
    pass(s); // p1
    // p1 leads no region containing (2,2); none is one-from-complete
    expect(() => applyAction(s, place(cell(2, 2), 9))).toThrow();
  });
});

describe("integration — random loadouts play to a clean finish", () => {
  it("100 games end with a consistent winner and no throws", () => {
    for (let g = 0; g < 100; g++) {
      const rng = makeRng(7000 + g);
      const s = createGame({
        loadouts: [randomLoadout(SIZE, rng), randomLoadout(SIZE, rng)],
        firstPlayer: (g % 2) as 0 | 1,
      });
      let guard = 0;
      while (s.status === "playing" && guard++ < 200) {
        const acts = legalActions(s);
        expect(acts.length).toBeGreaterThan(0);
        applyAction(s, rng.pick(acts));
      }
      expect(s.status).toBe("ended");
      const total = s.score[0] + s.score[1];
      expect(total).toBeLessThanOrEqual(s.regions.length);
      if (s.winner === "draw" || s.winner === null) {
        expect(s.score[0]).toBe(s.score[1]);
      } else {
        expect(s.score[s.winner]).toBeGreaterThanOrEqual(s.score[1 - s.winner]);
      }
    }
  });
});
