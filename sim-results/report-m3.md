# Dendoku milestone 3 — animals & drafting

Legs per scenario: 250. 9x9, endScoring=majority, seeds=6.
First move alternates each leg. "A wins" is the first-named loadout.
A big skew in an asymmetric archetype row = that loadout dominates.
Mirror rows (same archetype both sides) should sit near 40/40/20.

Archetype teams (digit 1..9):
- **anchor**: tortoise, hedgehog, newt, robin, otter, dormouse, squirrel, sparrow, wren
- **tempo**: wren, sparrow, mole, lark, squirrel, otter, robin, hedgehog, tortoise
- **economy**: squirrel, otter, robin, dormouse, newt, hedgehog, tortoise, wren, sparrow

| scenario | legs | A wins | B wins | draw | 1st-mover W | last-mover W | stuck | stalled | grid-full | avg plies | avg margin |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mirror-random -v- mirror-random | animal-v-random+ | seeds=6 | 250 | 100.0% | 0.0% | 0.0% | 50.0% | 48.4% | 99.6% | 0.4% | 0.0% | 66.2 | 14.71 |
| mirror-random -v- mirror-random | animal-v-animal | seeds=6 | 250 | 46.0% | 43.6% | 10.4% | 49.1% | 66.5% | 100.0% | 0.0% | 0.0% | 69.9 | 3.90 |
| random -v- random | animal-v-animal | seeds=6 | 250 | 45.6% | 48.0% | 6.4% | 51.3% | 64.5% | 100.0% | 0.0% | 0.0% | 69.9 | 6.60 |
| anchor -v- anchor | animal-v-animal | seeds=6 | 250 | 46.8% | 50.4% | 2.8% | 43.2% | 59.3% | 99.2% | 0.8% | 0.0% | 68.7 | 4.41 |
| anchor -v- tempo | animal-v-animal | seeds=6 | 250 | 1.6% | 98.0% | 0.4% | 49.8% | 68.7% | 99.6% | 0.4% | 0.0% | 70.1 | 10.66 |
| anchor -v- economy | animal-v-animal | seeds=6 | 250 | 21.6% | 71.6% | 6.8% | 60.9% | 63.9% | 98.4% | 1.6% | 0.0% | 67.6 | 3.95 |
| tempo -v- anchor | animal-v-animal | seeds=6 | 250 | 98.8% | 0.8% | 0.4% | 51.0% | 71.5% | 99.6% | 0.4% | 0.0% | 69.6 | 11.00 |
| tempo -v- tempo | animal-v-animal | seeds=6 | 250 | 46.0% | 46.0% | 8.0% | 56.1% | 63.5% | 100.0% | 0.0% | 0.0% | 70.5 | 4.02 |
| tempo -v- economy | animal-v-animal | seeds=6 | 250 | 94.4% | 4.0% | 1.6% | 50.8% | 58.9% | 100.0% | 0.0% | 0.0% | 68.0 | 7.97 |
| economy -v- anchor | animal-v-animal | seeds=6 | 250 | 69.2% | 22.8% | 8.0% | 52.2% | 58.7% | 98.8% | 1.2% | 0.0% | 67.3 | 3.86 |
| economy -v- tempo | animal-v-animal | seeds=6 | 250 | 1.2% | 94.8% | 4.0% | 50.4% | 58.8% | 100.0% | 0.0% | 0.0% | 68.1 | 8.15 |
| economy -v- economy | animal-v-animal | seeds=6 | 250 | 50.4% | 46.8% | 2.8% | 50.6% | 56.0% | 98.8% | 1.2% | 0.0% | 68.9 | 4.74 |
