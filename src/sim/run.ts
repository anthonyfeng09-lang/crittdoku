import { writeFileSync, mkdirSync } from "node:fs";
import {
  CONFIG_9x9,
  GameState,
  Player,
  applyAction,
  autoDraft,
  createGame,
  generateSeeds,
} from "../engine";
import { makeRng } from "../engine/rng";
import { Bot, bots } from "./bots";

interface LegResult {
  score: [number, number];
  firstPlayer: Player;
  lastMover: Player | null;
  endReason: GameState["endReason"];
  plies: number;
}

function playLeg(botA: Bot, botB: Bot, firstPlayer: Player, seed: number): LegResult {
  const rng = makeRng(seed);
  const { loadouts } = autoDraft(9, rng);
  const seeds = generateSeeds(CONFIG_9x9, 6, rng);
  const state = createGame({
    config: CONFIG_9x9,
    rules: { endScoring: "majority" },
    seeds,
    firstPlayer,
    loadouts,
  });
  const seat: [Bot, Bot] = [botA, botB];
  let guard = 0;
  while (state.status === "playing" && guard++ < 400) {
    applyAction(state, seat[state.current].choose(state, rng));
  }
  const last = state.history[state.history.length - 1];
  return {
    score: [state.score[0], state.score[1]],
    firstPlayer,
    lastMover: last ? (last.by as Player) : null,
    endReason: state.endReason,
    plies: state.history.length,
  };
}

interface Agg {
  label: string;
  legs: number;
  aWins: number;
  bWins: number;
  draws: number;
  firstWins: number;
  lastMoverWins: number;
  lastMoverDecided: number;
  stuck: number;
  stalled: number;
  gridFull: number;
  pliesSum: number;
  marginSum: number;
}

const emptyAgg = (label: string): Agg => ({
  label,
  legs: 0,
  aWins: 0,
  bWins: 0,
  draws: 0,
  firstWins: 0,
  lastMoverWins: 0,
  lastMoverDecided: 0,
  stuck: 0,
  stalled: 0,
  gridFull: 0,
  pliesSum: 0,
  marginSum: 0,
});

function record(agg: Agg, r: LegResult) {
  agg.legs++;
  const [a, b] = r.score;
  if (a === b) agg.draws++;
  else if (a > b) agg.aWins++;
  else agg.bWins++;
  if (a !== b) {
    if (r.firstPlayer === (a > b ? 0 : 1)) agg.firstWins++;
    if (r.lastMover !== null) {
      agg.lastMoverDecided++;
      if (r.lastMover === (a > b ? 0 : 1)) agg.lastMoverWins++;
    }
  }
  if (r.endReason === "no-legal-move") agg.stuck++;
  if (r.endReason === "stalled") agg.stalled++;
  if (r.endReason === "grid-full") agg.gridFull++;
  agg.pliesSum += r.plies;
  agg.marginSum += Math.abs(a - b);
}

const pct = (x: number, d: number) =>
  d === 0 ? "  -  " : `${((100 * x) / d).toFixed(1)}%`;

function run(label: string, botA: Bot, botB: Bot, legs: number): Agg {
  const agg = emptyAgg(label);
  for (let i = 0; i < legs; i++) {
    record(agg, playLeg(botA, botB, (i % 2) as Player, 0x3000 + i * 2654435761));
  }
  return agg;
}

function table(rows: Agg[]): string {
  const head =
    "| scenario | legs | A wins | B wins | draw | 1st-mover W | last-mover W | stuck | stalled | grid-full | avg plies | avg margin |";
  const sep = "|" + "---|".repeat(12);
  const body = rows.map(
    (a) =>
      `| ${a.label} | ${a.legs} | ${pct(a.aWins, a.legs)} | ${pct(a.bWins, a.legs)} | ${pct(
        a.draws,
        a.legs,
      )} | ${pct(a.firstWins, a.aWins + a.bWins)} | ${pct(
        a.lastMoverWins,
        a.lastMoverDecided,
      )} | ${pct(a.stuck, a.legs)} | ${pct(a.stalled, a.legs)} | ${pct(
        a.gridFull,
        a.legs,
      )} | ${(a.pliesSum / a.legs).toFixed(1)} | ${(a.marginSum / a.legs).toFixed(2)} |`,
  );
  return [head, sep, ...body].join("\n");
}

function main() {
  const LEGS = Number(process.env.LEGS ?? 1200);
  const rows: Agg[] = [
    run("critter -v- random+ (skill)", bots.critter, bots["random+"], LEGS),
    run("critter -v- critter (balance)", bots.critter, bots.critter, LEGS),
    run("territory -v- critter (abilities matter)", bots.territory, bots.critter, LEGS),
  ];

  const md =
    `# Dendoku milestone 4 - creatures + snake draft\n\n` +
    `Legs per scenario: ${LEGS}. 9x9, endScoring=majority, seeds=6.\n` +
    `Loadouts come from an auto snake draft of the shared 18-creature pool\n` +
    `(exclusive picks), so neither side can hoard a category. First move\n` +
    `alternates each leg. "critter -v- critter" should sit near 45/45/10.\n\n` +
    table(rows) +
    "\n";

  console.log(md);
  mkdirSync("sim-results", { recursive: true });
  writeFileSync("sim-results/report-m4.md", md);
  console.log("\nwrote sim-results/report-m4.md");
}

main();
