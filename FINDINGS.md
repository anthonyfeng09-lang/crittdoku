# Milestone 1 findings — the core loop has a structural problem

Built: rules engine (`src/engine`), self-play simulator (`src/sim`), minimal
hot-seat UI (`src/ui`). 12 engine tests pass. Simulator plays 3,000 games per
scenario across board size, seed count, end-scoring rule, and bot matchup.

## The headline: the grid never fills, so the end-game rule decides everything

In **100% of simulated games** — every board size, every seed count, random
_and_ greedy bots — the game ends because a player has **no legal move**, not
because the grid filled. On 9x9 the deadlock hits around move 60–65 with
15–20 cells still empty and none of them able to take any digit. This was
verified independently with a brute-force scan (`src/sim/diagnose.ts`), so it
is not an engine bug — it is inherent to sudoku-style constraints under play
that isn't specifically trying to keep the board alive.

Consequence: regions almost never complete _during_ play. The "race to place
the last cell of a region" loop from the spec barely fires. ~26 of 27 regions
are decided by the end-of-game settlement, not by gameplay.

## The spec's v1 rule ("opponent claims every unfinished region") is a coin flip

| end rule | last-mover wins | avg margin (of 27) | draws | skill (greedy vs random) |
|---|---|---|---|---|
| **sweep** (spec v1) | **100.0%** | **~26** | 0% | none — 50/50 |
| keep (unclaimed = nobody) | 55–96% | ~0.5 | 50–62% | weak, draw-heavy |
| majority (unclaimed → territory leader) | 58–74% | ~2 | 12–18% | clear — greedy beats random 60–72% |

- **sweep**: whoever makes the last placement wins by a blowout, every game.
  First-seat vs second-seat is 50/50, so it is not a seat-parity bug — the
  entire match is one swing event (who gets stuck), and everything before it
  is noise. This is worse than the parity risk the spec anticipated.
- **6x6 grid and randomized seeds do not help** — both were the spec's
  proposed mitigations; the sim shows sweep stays at 100% last-mover / ~16 of
  16 margin for 6x6.
- **keep**: removes the nuke but scoring events become so rare the game is
  mostly draws decided by a single lucky region.
- **majority** (each unfinished region goes to whoever holds the most cells in
  it): the healthiest. The board position at the freeze matters, skill beats
  randomness decisively, blowouts are gone. Residual issues: a real
  first-move advantage (~50% vs ~35%) and last-mover still ~65%.

## Recommendation before building animals / energy

1. **Design the game around the freeze, not against it.** The deadlock is
   structural; treat the frozen board as the scoring position. Adopt
   **majority/territory scoring** for unfinished regions.
2. **Reframe "claiming" as a bonus, not the main loop.** Completing a region
   early could _lock_ it (immune to later majority swings) or pay energy —
   a tactical option, while territory is the base game. This matches the calm
   theme better than a sudden-death sweep anyway.
3. **Neutralize first-move advantage**: a match = 2 games with first move
   swapped (aggregate score), or give P2 the seed-layout choice / starting
   energy.
4. **Then** decide whether animal passives that keep the board alive (move a
   digit, remove a digit, delay completion) can push deadlock later or even to
   a real fill — but they should be built on the territory foundation, not the
   sweep one.
5. Add a stronger bot (minimax/MCTS) to the sim to confirm the skill ceiling
   under majority scoring before committing.

---

# Milestone 2 — territory scoring adopted

`endScoring: "majority"` is now the engine default. Completing a region in
play claims + **locks** it (a tactical bonus); everything else is settled at
the freeze by cell-count majority. Added `territoryBot` (greedy on
frozen-now score) and `mobilityBot` (territory value, then keep the board
alive), a best-of-2 match mode (first move swapped, aggregate score), and
`projectedScore` / `territoryHolder` for the live UI.

Sim: 400 matches/scenario, `sim-results/report-m2.md`.

## What changed vs the v1 sweep rule

| metric | v1 sweep | v2 majority (skilled mirror) |
|---|---|---|
| avg score margin (9x9, /27) | **~26** | **~1.6** |
| last-mover win rate | **100%** | ~70–75% |
| skill: territory bot vs random | 50% (none) | **80–100%**, +7 margin |
| match draws (mirror, bo2) | 0% | 13–20% |

- **The core loop now rewards skill.** A territory-seeking bot beats a random
  bot 80–100% of matches. Games are close (margin ~1.6 of 27), not blowouts.
- **The grid still deadlocks 100% of the time** — even the mobility bot that
  tries to keep it alive can't force a fill (and often ends games *sooner*
  by taking favourable terminal positions). Territory scoring accepts this
  by design.
- **Best-of-2 neutralizes the first-move edge.** Going first is worth ~75% at
  the single-leg level; a match of two legs with the first move swapped comes
  out ~balanced (40/42/18 A/B/draw in mirrors).

## Remaining concerns for the animal/energy layer

1. **Tempo still matters a lot.** Last-mover win rate is ~72% in skilled play
   — softened from 100% but not gone. bo2 fixes first-move, not last-move.
   Energy abilities that manipulate the freeze timing (lock a cell, delay a
   region, extra placement) will swing this further; watch it doesn't snap
   back to a tempo-decides game.
2. **Draw rate.** Mirror bo2 draws 13–20%. Needs a tiebreak — locked-region
   count, then energy, then first-leg result.
3. **Deadlock timing is the real skill.** ~55–65 plies on 9x9 with wide
   variance. The interesting decision is *when* to let the board freeze and
   with what territory split — abilities should lean into that, not paper
   over it.
4. Still worth an MCTS bot to confirm the skill ceiling before committing 9
   passives.

---

## Repro

```bash
npm install
npm test                      # engine tests (15)
npm run sim                   # milestone-2 matrix -> sim-results/report-m2.md
MATCHES=2000 npm run sim      # tighter numbers
npx tsx src/sim/diagnose.ts   # deadlock sanity check
npm run dev                   # hot-seat UI (grid / seeds / freeze-rule selectors)
```
