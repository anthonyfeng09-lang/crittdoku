# Dendoku core-loop simulation

Games per scenario: 3000. First player alternates each match; seeds
are random per match. "last-mover W" = of decisive games, how often the
player who made the final placement won. "stuck" = share of games that
ended because a player had no legal move (vs the grid filling).

| scenario | n | 1st W | 2nd W | draw | last-mover W | grid-full | stuck | avg plies | avg margin |
|---|---|---|---|---|---|---|---|---|---|
| 9x9 | end=sweep | seeds=1 | random-v-random | 3000 | 50.2% | 49.8% | 0.0% | 100.0% | 0.0% | 100.0% | 64.3 | 26.10 |
| 9x9 | end=sweep | seeds=1 | greedy-v-greedy | 3000 | 47.3% | 52.7% | 0.0% | 100.0% | 0.0% | 100.0% | 64.2 | 26.79 |
| 9x9 | end=sweep | seeds=1 | greedy-v-random | 3000 | 49.4% | 50.6% | 0.0% | 100.0% | 0.0% | 100.0% | 64.3 | 26.08 |
| 9x9 | end=sweep | seeds=6 | random-v-random | 3000 | 49.8% | 50.2% | 0.0% | 100.0% | 0.0% | 100.0% | 59.3 | 26.10 |
| 9x9 | end=sweep | seeds=6 | greedy-v-greedy | 3000 | 52.7% | 47.3% | 0.0% | 100.0% | 0.0% | 100.0% | 59.2 | 26.79 |
| 9x9 | end=sweep | seeds=6 | greedy-v-random | 3000 | 50.2% | 49.8% | 0.0% | 100.0% | 0.0% | 100.0% | 59.3 | 26.06 |
| 9x9 | end=keep | seeds=1 | random-v-random | 3000 | 23.7% | 23.6% | 52.7% | 55.5% | 0.0% | 100.0% | 64.3 | 0.63 |
| 9x9 | end=keep | seeds=1 | greedy-v-greedy | 3000 | 18.2% | 19.5% | 62.3% | 96.5% | 0.0% | 100.0% | 64.2 | 0.46 |
| 9x9 | end=keep | seeds=1 | greedy-v-random | 3000 | 52.9% | 1.5% | 45.6% | 53.2% | 0.0% | 100.0% | 64.3 | 0.91 |
| 9x9 | end=keep | seeds=6 | random-v-random | 3000 | 23.6% | 23.7% | 52.7% | 55.5% | 0.0% | 100.0% | 59.3 | 0.63 |
| 9x9 | end=keep | seeds=6 | greedy-v-greedy | 3000 | 19.5% | 18.2% | 62.3% | 96.5% | 0.0% | 100.0% | 59.2 | 0.46 |
| 9x9 | end=keep | seeds=6 | greedy-v-random | 3000 | 52.8% | 1.6% | 45.6% | 53.7% | 0.0% | 100.0% | 59.3 | 0.88 |
| 9x9 | end=majority | seeds=1 | random-v-random | 3000 | 49.8% | 36.0% | 14.2% | 60.3% | 0.0% | 100.0% | 64.3 | 2.14 |
| 9x9 | end=majority | seeds=1 | greedy-v-greedy | 3000 | 49.0% | 36.8% | 14.2% | 64.8% | 0.0% | 100.0% | 64.2 | 2.15 |
| 9x9 | end=majority | seeds=1 | greedy-v-random | 3000 | 62.2% | 25.3% | 12.5% | 58.2% | 0.0% | 100.0% | 64.3 | 2.38 |
| 9x9 | end=majority | seeds=6 | random-v-random | 3000 | 48.5% | 35.5% | 15.9% | 60.2% | 0.0% | 100.0% | 59.3 | 2.06 |
| 9x9 | end=majority | seeds=6 | greedy-v-greedy | 3000 | 49.8% | 35.5% | 14.7% | 67.4% | 0.0% | 100.0% | 59.2 | 2.13 |
| 9x9 | end=majority | seeds=6 | greedy-v-random | 3000 | 60.5% | 25.3% | 14.2% | 59.6% | 0.0% | 100.0% | 59.3 | 2.33 |
| 6x6 | end=sweep | seeds=1 | random-v-random | 3000 | 51.5% | 48.5% | 0.0% | 100.0% | 0.0% | 100.0% | 28.0 | 16.04 |
| 6x6 | end=sweep | seeds=1 | greedy-v-greedy | 3000 | 50.4% | 49.6% | 0.0% | 100.0% | 0.0% | 100.0% | 27.4 | 17.37 |
| 6x6 | end=sweep | seeds=1 | greedy-v-random | 3000 | 50.8% | 49.0% | 0.2% | 100.0% | 0.1% | 99.9% | 27.9 | 15.98 |
| 6x6 | end=sweep | seeds=6 | random-v-random | 3000 | 48.5% | 51.5% | 0.0% | 100.0% | 0.0% | 100.0% | 23.0 | 16.04 |
| 6x6 | end=sweep | seeds=6 | greedy-v-greedy | 3000 | 49.7% | 50.3% | 0.0% | 100.0% | 0.0% | 100.0% | 22.4 | 17.37 |
| 6x6 | end=sweep | seeds=6 | greedy-v-random | 3000 | 49.0% | 50.7% | 0.3% | 99.7% | 0.0% | 100.0% | 22.9 | 15.65 |
| 6x6 | end=keep | seeds=1 | random-v-random | 3000 | 33.1% | 31.0% | 35.8% | 64.3% | 0.0% | 100.0% | 28.0 | 1.06 |
| 6x6 | end=keep | seeds=1 | greedy-v-greedy | 3000 | 21.3% | 21.1% | 57.6% | 93.9% | 0.0% | 100.0% | 27.4 | 0.54 |
| 6x6 | end=keep | seeds=1 | greedy-v-random | 3000 | 72.3% | 2.1% | 25.7% | 55.4% | 0.1% | 99.9% | 27.9 | 1.82 |
| 6x6 | end=keep | seeds=6 | random-v-random | 3000 | 31.0% | 33.1% | 35.8% | 64.3% | 0.0% | 100.0% | 23.0 | 1.06 |
| 6x6 | end=keep | seeds=6 | greedy-v-greedy | 3000 | 21.1% | 21.2% | 57.7% | 93.9% | 0.0% | 100.0% | 22.4 | 0.54 |
| 6x6 | end=keep | seeds=6 | greedy-v-random | 3000 | 72.1% | 2.3% | 25.6% | 51.9% | 0.0% | 100.0% | 22.9 | 1.82 |
| 6x6 | end=majority | seeds=1 | random-v-random | 3000 | 50.8% | 33.7% | 15.5% | 65.5% | 0.0% | 100.0% | 28.0 | 1.99 |
| 6x6 | end=majority | seeds=1 | greedy-v-greedy | 3000 | 50.5% | 33.0% | 16.6% | 71.2% | 0.0% | 100.0% | 27.4 | 1.89 |
| 6x6 | end=majority | seeds=1 | greedy-v-random | 3000 | 70.3% | 17.2% | 12.5% | 62.4% | 0.1% | 99.9% | 27.9 | 2.64 |
| 6x6 | end=majority | seeds=6 | random-v-random | 3000 | 51.1% | 31.5% | 17.3% | 67.8% | 0.0% | 100.0% | 23.0 | 1.90 |
| 6x6 | end=majority | seeds=6 | greedy-v-greedy | 3000 | 52.0% | 29.9% | 18.1% | 74.3% | 0.0% | 100.0% | 22.4 | 1.83 |
| 6x6 | end=majority | seeds=6 | greedy-v-random | 3000 | 71.9% | 14.5% | 13.6% | 60.0% | 0.0% | 100.0% | 22.9 | 2.54 |
