# Dendoku milestone 3 — animals & drafting

Legs per scenario: 400. 9x9, endScoring=majority, seeds=6.
First move alternates each leg. "A wins" is the first-named loadout.
A big skew in an asymmetric archetype row = that loadout dominates.
Mirror rows (same archetype both sides) should sit near 40/40/20.

Archetype teams (digit 1..9):
- **anchor**: tortoise, hedgehog, newt, robin, otter, dormouse, squirrel, sparrow, wren
- **tempo**: wren, sparrow, mole, lark, squirrel, otter, robin, hedgehog, tortoise
- **economy**: squirrel, otter, robin, dormouse, newt, hedgehog, tortoise, wren, sparrow

| scenario | legs | A wins | B wins | draw | 1st-mover W | last-mover W | stuck | stalled | grid-full | avg plies | avg margin |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mirror-random -v- mirror-random | animal-v-random+ | seeds=6 | 400 | 99.8% | 0.3% | 0.0% | 50.3% | 48.5% | 100.0% | 0.0% | 0.0% | 63.2 | 14.14 |
| random -v- random | animal-v-animal | seeds=6 | 400 | 47.5% | 47.5% | 5.0% | 53.4% | 60.5% | 100.0% | 0.0% | 0.0% | 67.2 | 6.81 |
| anchor -v- anchor | animal-v-animal | seeds=6 | 400 | 44.5% | 49.0% | 6.5% | 46.5% | 50.5% | 100.0% | 0.0% | 0.0% | 64.7 | 3.70 |
| tempo -v- tempo | animal-v-animal | seeds=6 | 400 | 43.3% | 48.3% | 8.5% | 54.1% | 65.3% | 100.0% | 0.0% | 0.0% | 68.7 | 3.92 |
| economy -v- economy | animal-v-animal | seeds=6 | 400 | 48.5% | 45.3% | 6.3% | 38.4% | 49.9% | 100.0% | 0.0% | 0.0% | 64.5 | 3.78 |
| anchor -v- tempo | animal-v-animal | seeds=6 | 400 | 0.5% | 99.3% | 0.3% | 50.1% | 54.1% | 100.0% | 0.0% | 0.0% | 65.9 | 12.17 |
| anchor -v- economy | animal-v-animal | seeds=6 | 400 | 27.3% | 60.5% | 12.3% | 58.7% | 54.4% | 100.0% | 0.0% | 0.0% | 64.2 | 2.94 |
| tempo -v- economy | animal-v-animal | seeds=6 | 400 | 96.0% | 2.3% | 1.8% | 50.1% | 64.4% | 100.0% | 0.0% | 0.0% | 65.0 | 7.30 |


wrote sim-results/report-m3.md
