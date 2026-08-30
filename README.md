# Dendoku

A two-player competitive sudoku variant. There is no predetermined solution -
a digit is legal as long as it doesn't repeat in its row, column, or 3×3 box.
Players alternate placing digits on a shared grid; completing a region (a full
row, column, or box) claims it.

## Status: milestone 4 - creatures, snake draft, friendly theme

Each milestone is playtested by simulation before the next is built.
**Read [FINDINGS.md](FINDINGS.md) - each milestone turned up something.**

- **M1** core placement/claiming: the grid deadlocks ~100% before it fills, so
  the spec's "opponent sweeps all regions" rule is a coin flip (100% last-mover,
  ~26/27 blowout). 6x6 and random seeds don't help.
- **M2** territory scoring: unclaimed regions settle by cell-count majority;
  completing one locks it early. Margins drop to ~1.6/27, skill beats random
  80-100%.
- **M3 / M3a** creature roster + passives + nerfs: abilities are decisive
  skill; a free digit-assignment draft let one team hoard the strong
  category (~97% win). Fixed structurally in M4.
- **M4** 18 creatures in 6 types, **snake draft** from a shared exclusive
  pool, hand-built SVG characters, light colourful theme, and a **best-of-2
  match** (teams swap between legs) so the draft is fair.

```
src/engine/   rules engine + creature registry + draft, tests alongside
src/sim/      self-play simulator + deadlock diagnostic
src/ui/       hot-seat React UI (Vite): snake-draft two teams, then play
sim-results/  generated simulation reports
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
import { createGame, applyAction, autoDraft, loadoutFromIds } from "./src/engine";

const { loadouts } = autoDraft(9, rng);
const s = createGame({ rules: { endScoring: "majority" }, loadouts, seeds });

applyAction(s, { type: "place", cell: 0, digit: 5 }); // throws if illegal
applyAction(s, { type: "move", from: 0, to: 1 });     // a Gust hop
s.score;   // [p0, p1] regions held
s.status;  // "playing" | "ended"
```
