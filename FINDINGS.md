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

# Milestone 3 — animals & drafting

An 11-animal roster (`src/engine/animals.ts`), each a declarative passive the
engine reads. A team = 9 animals bound to digits 1–9. Engine now supports
`move` (Sparrow), replace (Mole), wild placement (Lark), extra placement
(Wren), dormancy (Dormouse), regrow immunity (Newt), Hedgehog lock-denial,
Otter double weight, Robin tie-break, plus a **stall freeze** (6 consecutive
no-progress actions end the game) so hop/replace loops can't run forever.
`animalBot` plays the full action set. 26 engine tests.

Sim: 250 legs/scenario, `sim-results/report-m3.md`, archetype teams:

| team | digits 1–9 |
|---|---|
| **anchor** | tortoise hedgehog newt robin otter dormouse squirrel sparrow wren |
| **tempo** | wren sparrow mole lark squirrel otter robin hedgehog tortoise |
| **economy** | squirrel otter robin dormouse newt hedgehog tortoise wren sparrow |

## What works

- **Abilities are decisive skill, not noise.** `animalBot` beats a
  random-action bot 100% (margin ~15/27).
- **Mirror matches are balanced by seat** (46/44/10), margin ~3.9, first-mover
  ~49%. Draw rate down to ~10% (Robin tie-break helping).
- **Games run longer** (~70 plies vs ~65) — animals keep the board alive a
  little — but it still deadlocks ~100% of the time. The stall freeze fires
  in <2% of games, so it isn't triggering spuriously.

## What's broken: the roster is not balanced

The archetype matrix is lopsided — **tempo ≫ economy > anchor**:

| matchup | result |
|---|---|
| tempo vs anchor | **98.8% / 0.8%** |
| tempo vs economy | **94.4% / 4.0%** |
| economy vs anchor | 69.2% / 22.8% |
| all mirrors | ~46 / 46 / 8 |

A team stacking the **action-economy passives — Wren (extra placement), Lark
(wild), Mole (removal), Sparrow (hop) — on the low digits wins ~97% against
any positional team** (Tortoise / Hedgehog / Otter / Robin). Putting the
power animals on digits 1–4 (played more often, easier to place early) makes
it worse.

Caveat: `animalBot` is tuned to value Wren/tempo, which may inflate the
magnitude — but the skew is a pure loadout effect (same bot both sides), so
the direction is real.

## Recommendation before the energy/ability layer

1. **Rebalance the roster.** Isolate the culprits — run `tempo`-minus-one
   variants vs `anchor` — then either weaken the action-economy passives
   (Wren costs a placement's worth of tempo elsewhere; Mole only on a
   contested region; Lark can't complete a region) or strengthen the
   positional ones (Otter x3 weight; Hedgehog also steals the region on a
   contested freeze; Tortoise scores +1 on its own).
2. **Consider a draft that prevents stacking** — snake draft from a shared
   pool, or "no more than 2 action-economy animals per team", or ban binding
   power animals to digits 1–3.
3. **The digit assignment matters as much as the pick.** Low digits are
   played more; a balance pass has to weight passives by expected placements.
4. Tempo (last-mover ~60–70%) and draw rate (~8%) are both improved but not
   solved — the tiebreak (locked regions → energy → first leg) is still
   worth adding.

---

# Milestone 3a - roster nerfs

Nerfed the four dominant passives: Wren (extra placement now forfeits your
next turn), Mole (only on a cell in a region the victim is contesting), Lark
(wild placement cannot complete a region), Sparrow (2 hops per match, cannot
complete a region). Added a draw tiebreak (regions locked in play, then
energy). `sim-results/report-m3a.md`.

Result: **mirrors are now balanced (44-49) and last-mover drops to ~50% for
the anchor/economy mirrors** (tempo mirror still ~65%). Draw rate ~6%. But
**the tempo team still beats anchor 99% and economy 96%** - stacking the
action-economy creatures on the low digits is still oppressive even nerfed.

Conclusion: nerfs alone will not balance a free-assignment draft. The fix is
a **shared-pool draft** (creatures are exclusive, drafted alternately) so one
side cannot hoard a category. This also matches the new creature/draft
direction (milestone 4).

---

## Repro

```bash
npm install
npm test                      # engine tests (26)
npm run sim                   # milestone-3 archetype matrix -> sim-results/report-m3.md
LEGS=1500 npm run sim         # tighter numbers
npx tsx src/sim/diagnose.ts   # deadlock sanity check
npm run dev                   # hot-seat UI: draft two teams, then play
```
