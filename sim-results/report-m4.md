# Dendoku milestone 4 - creatures + snake draft

Legs per scenario: 500. 9x9, endScoring=majority, seeds=6.
Loadouts come from an auto snake draft of the shared 18-creature pool
(exclusive picks), so neither side can hoard a category. First move
alternates each leg. "critter -v- critter" should sit near 45/45/10.

| scenario | legs | A wins | B wins | draw | 1st-mover W | last-mover W | stuck | stalled | grid-full | avg plies | avg margin |
|---|---|---|---|---|---|---|---|---|---|---|---|
| critter -v- random+ (skill) | 500 | 85.0% | 11.4% | 3.6% | 50.6% | 51.5% | 100.0% | 0.0% | 0.0% | 63.4 | 7.87 |
| critter -v- critter (balance) | 500 | 33.4% | 64.2% | 2.4% | 50.2% | 52.9% | 100.0% | 0.0% | 0.0% | 65.2 | 8.20 |
| territory -v- critter (abilities matter) | 500 | 40.4% | 57.2% | 2.4% | 53.1% | 45.1% | 100.0% | 0.0% | 0.0% | 65.2 | 7.11 |
