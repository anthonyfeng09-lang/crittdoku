# Dendoku

A two-player competitive sudoku variant. There is no predetermined solution —
a digit is legal as long as it doesn't repeat in its row, column, or 3×3 box.
Players alternate placing digits on a shared grid; completing a region (a full
row, column, or box) claims it.

## Status: milestone 3 — animals & drafting

Each milestone is playtested by simulation before the next is built.
**Read [FINDINGS.md](FINDINGS.md) — each milestone turned up something.**

- **M1** core placement/claiming: the grid deadlocks ~100% before it fills, so
  the spec's "opponent sweeps all regions" rule is a coin flip (100% last-mover,
  ~26/27 blowout). 6×6 and random seeds don't help.
- **M2** territory scoring: unclaimed regions settle by cell-count majority;
  completing one locks it early. Margins drop to ~1.6/27, skill beats random
  80–100%, best-of-2 kills the first-move edge.
- **M3** 11-animal roster + draft: abilities are decisive skill, but the roster
  is unbalanced — action-economy passives (Wren/Lark/Mole/Sparrow) stacked on
  low digits beat positional teams ~97%. Needs a rebalance / draft constraint.

```
src/engine/   pure rules engine (framework-free) + animal registry, tests alongside
src/sim/      self-play simulator + deadlock diagnostic
src/ui/       hot-seat React UI (Vite): draft two teams, then play
sim-results/  generated simulation reports (report.md / -m2 / -m3)
```

## Commands

```bash
npm install
npm test          # engine tests (26)
npm run sim       # current milestone's simulation matrix
npm run dev       # hot-seat UI at localhost:5173
```

## Engine API sketch

```ts
import { createGame, applyAction, legalActions, loadoutFrom } from "./src/engine";

const s = createGame({
  rules: { endScoring: "majority" },
  loadouts: [loadoutFrom([...9 animal ids], 9), loadoutFrom([...], 9)],
  seeds,
});
applyAction(s, { type: "place", cell: 0, digit: 5 }); // throws if illegal
applyAction(s, { type: "move", from: 0, to: 1 });     // Sparrow hop
s.score;   // [p0, p1] regions held
s.status;  // "playing" | "ended"
```
