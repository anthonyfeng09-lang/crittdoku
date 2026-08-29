# Dendoku milestone 2 — territory scoring

Matches per scenario: 800. endScoring = majority for all rows.
"single" = one leg, first move alternates by match. "bo2" = two legs
with first move swapped, aggregate region score decides the match.
"A wins" is from botA's perspective (first column of each matchup); a
value far from 50% in a mirror matchup = first-move advantage.

| scenario | matches | A wins | B wins | match draw | leg 1st-mover W | last-mover W | stuck | avg plies | avg margin |
|---|---|---|---|---|---|---|---|---|---|
| 9x9 | majority | single | seeds=1 | territory-v-territory | 800 | 40.8% | 38.8% | 20.5% | 78.6% | 69.3% | 100.0% | 64.6 | 1.51 |
| 9x9 | majority | single | seeds=1 | territory-v-random | 800 | 99.8% | 0.1% | 0.1% | 50.2% | 51.8% | 100.0% | 65.0 | 7.32 |
| 9x9 | majority | single | seeds=1 | mobility-v-territory | 800 | 52.5% | 30.6% | 16.9% | 68.9% | 71.1% | 100.0% | 69.2 | 1.85 |
| 9x9 | majority | single | seeds=1 | mobility-v-random | 800 | 99.6% | 0.0% | 0.4% | 50.1% | 51.4% | 100.0% | 67.1 | 7.67 |
| 9x9 | majority | bo2 | seeds=1 | territory-v-territory | 800 | 41.6% | 42.8% | 15.6% | 78.7% | 70.2% | 100.0% | 64.6 | 1.54 |
| 9x9 | majority | bo2 | seeds=1 | territory-v-random | 800 | 100.0% | 0.0% | 0.0% | 50.1% | 51.3% | 100.0% | 65.0 | 7.34 |
| 9x9 | majority | bo2 | seeds=1 | mobility-v-territory | 800 | 61.1% | 27.9% | 11.0% | 66.6% | 70.4% | 100.0% | 69.3 | 1.84 |
| 9x9 | majority | bo2 | seeds=1 | mobility-v-random | 800 | 100.0% | 0.0% | 0.0% | 50.0% | 50.3% | 100.0% | 67.1 | 7.84 |
| 9x9 | majority | single | seeds=8 | territory-v-territory | 800 | 41.5% | 40.9% | 17.6% | 72.8% | 71.3% | 100.0% | 57.6 | 1.63 |
| 9x9 | majority | single | seeds=8 | territory-v-random | 800 | 99.6% | 0.1% | 0.3% | 50.1% | 50.4% | 100.0% | 57.9 | 6.83 |
| 9x9 | majority | single | seeds=8 | mobility-v-territory | 800 | 45.9% | 37.6% | 16.5% | 65.3% | 69.6% | 100.0% | 62.2 | 1.92 |
| 9x9 | majority | single | seeds=8 | mobility-v-random | 800 | 99.6% | 0.3% | 0.1% | 50.1% | 55.4% | 100.0% | 60.2 | 7.23 |
| 9x9 | majority | bo2 | seeds=8 | territory-v-territory | 800 | 39.4% | 43.6% | 17.0% | 75.4% | 71.4% | 100.0% | 57.6 | 1.62 |
| 9x9 | majority | bo2 | seeds=8 | territory-v-random | 800 | 100.0% | 0.0% | 0.0% | 50.2% | 49.5% | 100.0% | 57.9 | 6.67 |
| 9x9 | majority | bo2 | seeds=8 | mobility-v-territory | 800 | 53.1% | 35.4% | 11.5% | 65.0% | 68.0% | 100.0% | 62.1 | 2.04 |
| 9x9 | majority | bo2 | seeds=8 | mobility-v-random | 800 | 100.0% | 0.0% | 0.0% | 50.1% | 52.9% | 100.0% | 60.1 | 7.25 |
| 6x6 | majority | single | seeds=1 | territory-v-territory | 800 | 39.6% | 41.4% | 19.0% | 70.4% | 73.0% | 100.0% | 28.3 | 1.79 |
| 6x6 | majority | single | seeds=1 | territory-v-random | 800 | 89.0% | 4.4% | 6.6% | 53.5% | 56.6% | 100.0% | 28.2 | 3.60 |
| 6x6 | majority | single | seeds=1 | mobility-v-territory | 800 | 32.1% | 56.1% | 11.8% | 60.8% | 67.7% | 90.1% | 31.5 | 3.09 |
| 6x6 | majority | single | seeds=1 | mobility-v-random | 800 | 86.5% | 7.0% | 6.5% | 53.6% | 58.2% | 99.4% | 29.9 | 3.90 |
| 6x6 | majority | bo2 | seeds=1 | territory-v-territory | 800 | 42.8% | 42.4% | 14.9% | 70.1% | 72.9% | 100.0% | 28.3 | 1.82 |
| 6x6 | majority | bo2 | seeds=1 | territory-v-random | 800 | 97.6% | 1.3% | 1.1% | 53.7% | 55.1% | 100.0% | 28.2 | 3.62 |
| 6x6 | majority | bo2 | seeds=1 | mobility-v-territory | 800 | 27.4% | 64.4% | 8.3% | 58.8% | 65.1% | 91.8% | 31.5 | 3.12 |
| 6x6 | majority | bo2 | seeds=1 | mobility-v-random | 800 | 96.3% | 2.5% | 1.3% | 53.3% | 57.1% | 99.3% | 29.9 | 3.91 |
| 6x6 | majority | single | seeds=8 | territory-v-territory | 800 | 39.9% | 40.5% | 19.6% | 70.0% | 71.7% | 100.0% | 21.2 | 1.65 |
| 6x6 | majority | single | seeds=8 | territory-v-random | 800 | 81.5% | 8.0% | 10.5% | 55.3% | 59.2% | 100.0% | 21.1 | 2.71 |
| 6x6 | majority | single | seeds=8 | mobility-v-territory | 800 | 37.5% | 46.5% | 16.0% | 57.1% | 71.7% | 97.1% | 23.5 | 2.20 |
| 6x6 | majority | single | seeds=8 | mobility-v-random | 800 | 85.4% | 7.3% | 7.4% | 52.8% | 60.3% | 99.4% | 22.6 | 3.17 |
| 6x6 | majority | bo2 | seeds=8 | territory-v-territory | 800 | 45.4% | 41.4% | 13.3% | 68.5% | 71.1% | 99.9% | 21.2 | 1.65 |
| 6x6 | majority | bo2 | seeds=8 | territory-v-random | 800 | 93.8% | 3.1% | 3.1% | 53.7% | 59.4% | 100.0% | 21.2 | 2.79 |
| 6x6 | majority | bo2 | seeds=8 | mobility-v-territory | 800 | 35.6% | 54.8% | 9.6% | 56.9% | 69.6% | 97.7% | 23.6 | 2.17 |
| 6x6 | majority | bo2 | seeds=8 | mobility-v-random | 800 | 90.4% | 5.3% | 4.4% | 54.0% | 60.6% | 99.8% | 22.6 | 3.03 |
