# Dendoku

A two-player competitive sudoku variant. There is no predetermined solution —
a digit is legal as long as it doesn't repeat in its row, column, or 3×3 box.
Players alternate placing digits on a shared grid; completing a region (a full
row, column, or box) claims it.

## Status: milestone 1 — core loop + playtest harness

Built first, before animals / energy / abilities, to pressure-test the
foundation. **It found a structural problem — see [FINDINGS.md](FINDINGS.md).**

```
src/engine/   pure rules engine (framework-free), Vitest tests alongside
src/sim/      self-play simulator + deadlock diagnostic
src/ui/       minimal hot-seat React UI (Vite)
sim-results/  generated simulation reports
```

## Commands

```bash
npm install
npm test          # engine tests
npm run sim       # simulation matrix -> sim-results/report.md
npm run dev       # hot-seat UI at localhost:5173
```

## Engine API sketch

```ts
import { createGame, legalMoves, applyMove, isLegal } from "./src/engine";

const s = createGame({ config: CONFIG_9x9, rules: { endScoring: "majority" }, seeds });
applyMove(s, { cell: 0, digit: 5 });   // throws on illegal move
s.score;      // [p0, p1] regions claimed
s.status;     // "playing" | "ended"
```
