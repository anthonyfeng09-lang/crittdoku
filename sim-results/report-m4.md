# Dendoku milestone 4 - creatures + snake draft

Legs per scenario: 600. 9x9, endScoring=majority, seeds=6.
Loadouts come from an auto snake draft of the shared 18-creature pool
(exclusive picks), so neither side can hoard a category. First move
alternates each leg. "critter -v- critter" should sit near 45/45/10.

| scenario | legs | A wins | B wins | draw | 1st-mover W | last-mover W | stuck | stalled | grid-full | avg plies | avg margin |
|---|---|---|---|---|---|---|---|---|---|---|---|
| critter -v- random+ (skill) | 600 | 85.7% | 11.3% | 3.0% | 52.4% | 53.6% | 100.0% | 0.0% | 0.0% | 62.3 | 8.07 |
| critter -v- critter (balance) | 600 | 45.3% | 52.8% | 1.8% | 53.1% | 53.0% | 100.0% | 0.0% | 0.0% | 65.4 | 9.17 |
| territory -v- critter (abilities matter) | 600 | 56.3% | 38.2% | 5.5% | 51.3% | 54.0% | 100.0% | 0.0% | 0.0% | 64.5 | 6.67 |


wrote sim-results/report-m4.md
