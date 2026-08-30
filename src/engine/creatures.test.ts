import { describe, expect, it } from "vitest";
import {
  ALL_CREATURES,
  CreatureId,
  Loadout,
  applyAction,
  autoDraft,
  createGame,
  legalActions,
  loadoutFromIds,
  makeRng,
  snakeOrder,
  territoryHolder,
} from "./index";

const SIZE = 9;
const cell = (r: number, c: number) => r * SIZE + c;
const place = (c: number, d: number, wild = false) =>
  ({ type: "place", cell: c, digit: d, wild }) as const;

/** filler critter is Shellclam: inert except freeze ties, which cancel */
function lo(overrides: Record<number, CreatureId>): Loadout {
  const ids: CreatureId[] = Array(SIZE).fill("shellclam");
  for (const [d, a] of Object.entries(overrides)) ids[Number(d) - 1] = a;
  return loadoutFromIds(ids, SIZE);
}
function rowOf(s: ReturnType<typeof createGame>, i: number) {
  return s.regions.find((r) => r.kind === "row" && r.index === i)!;
}
function pass(s: ReturnType<typeof createGame>) {
  const m = legalActions(s).find(
    (a) =>
      a.type === "place" &&
      !a.wild &&
      Math.floor(a.cell / SIZE) >= 6 &&
      a.cell % SIZE >= 6,
  );
  if (!m) throw new Error("no filler move");
  applyAction(s, m);
}

describe("snake draft", () => {
  it("gives each player teamSize picks, second-of-round-1 picks first next round", () => {
    const order = snakeOrder(9);
    expect(order).toHaveLength(18);
    expect(order.filter((p) => p === 0)).toHaveLength(9);
    expect(order.slice(0, 4)).toEqual([0, 1, 1, 0]);
  });

  it("autoDraft picks are exclusive and complete", () => {
    const { picks } = autoDraft(9, makeRng(1));
    expect(picks[0]).toHaveLength(9);
    expect(picks[1]).toHaveLength(9);
    const all = new Set([...picks[0], ...picks[1]]);
    expect(all.size).toBe(18);
    for (const id of all) expect(ALL_CREATURES).toContain(id);
  });
});

describe("hop budget comes from the drafted Drift critters", () => {
  it("Breezefinch adds 2, Tumbleweed adds 4, Glidewing adds 1", () => {
    const s = createGame({
      loadouts: [
        lo({ 1: "breezefinch", 2: "tumbleweed", 3: "glidewing" }),
        lo({}),
      ],
    });
    expect(s.charges[0].hops).toBe(7);
    expect(s.charges[1].hops).toBe(0);
  });
});

describe("Glidewing hops diagonally", () => {
  it("a Glidewing cell can hop to a diagonal neighbour", () => {
    const s = createGame({ loadouts: [lo({ 4: "glidewing" }), lo({})] });
    applyAction(s, place(cell(4, 4), 4));
    pass(s);
    applyAction(s, { type: "move", from: cell(4, 4), to: cell(5, 5) });
    expect(s.grid[cell(5, 5)]).toBe(4);
    expect(s.charges[0].hops).toBe(0);
  });
});

describe("Fogkit sleeps two turns", () => {
  it("still dormant after one opponent turn, awake after the next", () => {
    const s = createGame({ loadouts: [lo({ 6: "fogkit" }), lo({})] });
    applyAction(s, place(cell(0, 0), 6));
    expect(s.dormant[cell(0, 0)]).toBeGreaterThan(0);
    pass(s); // p1
    // p0's turn began; a 1-turn sleeper would be awake, Fogkit is not
    expect(s.dormant[cell(0, 0)]).toBeGreaterThan(0);
    pass(s); // p0
    pass(s); // p1
    // p0's turn again -> now awake
    expect(s.dormant[cell(0, 0)]).toBe(0);
  });
});

describe("Snoozemouse pounce on wake", () => {
  it("locks a region the owner leads when it wakes", () => {
    const s = createGame({ loadouts: [lo({ 6: "snoozemouse" }), lo({})] });
    // p0 builds a lead in row 0, then drops a Snoozemouse there
    applyAction(s, place(cell(0, 0), 1)); // p0
    applyAction(s, place(cell(5, 5), 1)); // p1 far away
    applyAction(s, place(cell(0, 2), 2)); // p0  (row 0: p0 leads 2-0)
    applyAction(s, place(cell(5, 6), 2)); // p1
    applyAction(s, place(cell(0, 4), 6)); // p0 Snoozemouse, asleep
    expect(rowOf(s, 0).claimedBy).toBeNull();
    pass(s); // p1
    // p0's turn: Snoozemouse wakes and pounces on row 0 (and col 4, box 1)
    expect(rowOf(s, 0).claimedBy).toBe(0);
  });
});

describe("Sunbeetle payout", () => {
  it("gains 3 energy when the opponent locks a region it sits in", () => {
    const s = createGame({ loadouts: [lo({}), lo({ 5: "sunbeetle" })] });
    const seq: Array<[number, number]> = [
      [cell(0, 0), 1],
      [cell(0, 1), 2],
      [cell(0, 2), 3],
      [cell(0, 3), 5], // p1 sunbeetle in row 0
      [cell(0, 4), 4],
      [cell(0, 5), 6],
      [cell(0, 6), 7],
      [cell(0, 7), 8],
    ];
    for (const [c, d] of seq) applyAction(s, place(c, d));
    const before = s.energy[1];
    applyAction(s, place(cell(0, 8), 9)); // p0 completes & locks row 0
    expect(rowOf(s, 0).claimedBy).toBe(0);
    expect(s.energy[1]).toBe(before + 3);
  });
});

describe("Mossback: double territory weight", () => {
  it("out-holds two ordinary opponent cells", () => {
    const s = createGame({
      loadouts: [lo({ 1: "mossback" }), lo({ 2: "nutsquirrel" })],
    });
    applyAction(s, place(cell(0, 0), 1)); // p0 mossback (weight 2)
    applyAction(s, place(cell(0, 1), 2)); // p1
    applyAction(s, place(cell(3, 3), 1)); // p0 filler far away
    applyAction(s, place(cell(0, 5), 4)); // p1, 2 cells in row 0 (weight 2)
    applyAction(s, place(cell(0, 8), 3)); // p0, weight 2 + 1 = 3 vs 2
    expect(territoryHolder(s, rowOf(s, 0))).toBe(0);
  });
});

describe("core passives still hold after the refactor", () => {
  it("Swiftwren burst forfeits the next turn", () => {
    const s = createGame({ loadouts: [lo({ 3: "swiftwren" }), lo({})] });
    applyAction(s, place(cell(0, 0), 3));
    expect(s.pendingExtra).toBe(true);
    applyAction(s, place(cell(1, 1), 1));
    expect(s.skipNext[0]).toBe(true);
    pass(s); // p1
    expect(s.current).toBe(1); // p0 skipped
    pass(s);
    expect(s.current).toBe(0);
  });

  it("Wildlark wild placement can't complete a region", () => {
    const s = createGame({ loadouts: [lo({ 5: "wildlark" }), lo({})] });
    for (const [c, d] of [
      [cell(0, 0), 1],
      [cell(0, 1), 2],
      [cell(0, 2), 3],
      [cell(0, 3), 4],
      [cell(0, 4), 6],
      [cell(0, 5), 7],
      [cell(0, 6), 8],
      [cell(0, 7), 9],
    ] as Array<[number, number]>) {
      applyAction(s, place(c, d));
    }
    expect(() => applyAction(s, place(cell(0, 8), 5, true))).toThrow();
  });

  it("Pricklehog denies the opponent's lock", () => {
    const s = createGame({ loadouts: [lo({}), lo({ 7: "pricklehog" })] });
    for (const [c, d] of [
      [cell(0, 0), 1],
      [cell(0, 1), 2],
      [cell(0, 2), 3],
      [cell(0, 3), 7],
      [cell(0, 4), 4],
      [cell(0, 5), 5],
      [cell(0, 6), 6],
      [cell(0, 7), 8],
      [cell(0, 8), 9],
    ] as Array<[number, number]>) {
      applyAction(s, place(c, d));
    }
    expect(rowOf(s, 0).claimedBy).toBeNull();
  });
});

describe("integration - drafted teams play to a clean finish", () => {
  it("120 auto-drafted games end consistently, no throws", () => {
    for (let g = 0; g < 120; g++) {
      const rng = makeRng(4000 + g);
      const { loadouts } = autoDraft(SIZE, rng);
      const s = createGame({
        loadouts,
        firstPlayer: (g % 2) as 0 | 1,
      });
      let guard = 0;
      while (s.status === "playing" && guard++ < 260) {
        const acts = legalActions(s);
        expect(acts.length).toBeGreaterThan(0);
        applyAction(s, rng.pick(acts));
      }
      expect(s.status).toBe("ended");
      expect(s.score[0] + s.score[1]).toBeLessThanOrEqual(s.regions.length);
      if (s.winner === "draw" || s.winner === null) {
        expect(s.score[0]).toBe(s.score[1]);
      } else {
        expect(s.score[s.winner]).toBeGreaterThanOrEqual(s.score[1 - s.winner]);
      }
    }
  });
});
