import { writeFileSync, mkdirSync } from "node:fs";
import {
  BoardConfig,
  CONFIG_6x6,
  CONFIG_9x9,
  EndScoring,
  GameState,
  Player,
  applyMove,
  createGame,
  generateSeeds,
} from "../engine";
import { makeRng } from "../engine/rng";
import { Bot, bots } from "./bots";

interface MatchResult {
  winner: Player | "draw";
  firstPlayer: Player;
  lastMover: Player | null;
  endReason: GameState["endReason"];
  plies: number;
  score: [number, number];
}

interface Scenario {
  config: BoardConfig;
  seedCount: number;
  endScoring: EndScoring;
  botA: Bot;
  botB: Bot;
}

function playMatch(sc: Scenario, firstPlayer: Player, matchSeed: number): MatchResult {
  const rng = makeRng(matchSeed);
  const seeds = generateSeeds(sc.config, sc.seedCount, rng);
  const state = createGame({
    config: sc.config,
    rules: { endScoring: sc.endScoring },
    seeds,
    firstPlayer,
  });
  const seatBots: [Bot, Bot] =
    firstPlayer === 0 ? [sc.botA, sc.botB] : [sc.botB, sc.botA];

  let guard = 0;
  const cap = sc.config.size * sc.config.size + 5;
  while (state.status === "playing" && guard++ < cap) {
    applyMove(state, seatBots[state.current].choose(state, rng));
  }

  const last = state.history[state.history.length - 1];
  return {
    winner: state.winner as Player | "draw",
    firstPlayer,
    lastMover: last ? (last.by as Player) : null,
    endReason: state.endReason,
    plies: state.history.length,
    score: [state.score[0], state.score[1]],
  };
}

interface Aggregate {
  label: string;
  n: number;
  firstMoverWins: number;
  secondMoverWins: number;
  draws: number;
  lastMoverWins: number;
  lastMoverDecided: number;
  gridFull: number;
  noLegalMove: number;
  pliesSum: number;
  marginSum: number;
}

function emptyAgg(label: string): Aggregate {
  return {
    label,
    n: 0,
    firstMoverWins: 0,
    secondMoverWins: 0,
    draws: 0,
    lastMoverWins: 0,
    lastMoverDecided: 0,
    gridFull: 0,
    noLegalMove: 0,
    pliesSum: 0,
    marginSum: 0,
  };
}

function record(agg: Aggregate, r: MatchResult) {
  agg.n++;
  if (r.winner === "draw") agg.draws++;
  else if (r.winner === r.firstPlayer) agg.firstMoverWins++;
  else agg.secondMoverWins++;
  if (r.winner !== "draw" && r.lastMover !== null) {
    agg.lastMoverDecided++;
    if (r.winner === r.lastMover) agg.lastMoverWins++;
  }
  if (r.endReason === "grid-full") agg.gridFull++;
  if (r.endReason === "no-legal-move") agg.noLegalMove++;
  agg.pliesSum += r.plies;
  agg.marginSum += Math.abs(r.score[0] - r.score[1]);
}

function pct(x: number, d: number): string {
  return d === 0 ? "  -  " : `${((100 * x) / d).toFixed(1)}%`;
}

function runScenario(sc: Scenario, games: number): Aggregate {
  const label =
    `${sc.config.size}x${sc.config.size} | end=${sc.endScoring} | ` +
    `seeds=${sc.seedCount} | ${sc.botA.name}-v-${sc.botB.name}`;
  const agg = emptyAgg(label);
  for (let i = 0; i < games; i++) {
    const first: Player = (i % 2) as Player;
    record(agg, playMatch(sc, first, 0x1000 + i * 2654435761));
  }
  return agg;
}

function table(rows: Aggregate[]): string {
  const head =
    "| scenario | n | 1st W | 2nd W | draw | last-mover W | grid-full | stuck | avg plies | avg margin |";
  const sep = "|---|---|---|---|---|---|---|---|---|---|";
  const body = rows.map(
    (a) =>
      `| ${a.label} | ${a.n} | ${pct(a.firstMoverWins, a.n)} | ${pct(
        a.secondMoverWins,
        a.n,
      )} | ${pct(a.draws, a.n)} | ${pct(a.lastMoverWins, a.lastMoverDecided)} | ${pct(
        a.gridFull,
        a.n,
      )} | ${pct(a.noLegalMove, a.n)} | ${(a.pliesSum / a.n).toFixed(1)} | ${(
        a.marginSum / a.n
      ).toFixed(2)} |`,
  );
  return [head, sep, ...body].join("\n");
}

function main() {
  const GAMES = Number(process.env.GAMES ?? 3000);
  const rows: Aggregate[] = [];

  const configs = [CONFIG_9x9, CONFIG_6x6];
  const seedCounts = [1, 6];
  const endScorings: EndScoring[] = ["sweep", "keep", "majority"];
  const matchups: Array<[Bot, Bot]> = [
    [bots.random, bots.random],
    [bots.greedy, bots.greedy],
    [bots.greedy, bots.random],
  ];

  for (const config of configs) {
    for (const endScoring of endScorings) {
      for (const seedCount of seedCounts) {
        for (const [botA, botB] of matchups) {
          rows.push(
            runScenario({ config, seedCount, endScoring, botA, botB }, GAMES),
          );
        }
      }
    }
  }

  const md =
    `# Dendoku core-loop simulation\n\n` +
    `Games per scenario: ${GAMES}. First player alternates each match; seeds\n` +
    `are random per match. "last-mover W" = of decisive games, how often the\n` +
    `player who made the final placement won. "stuck" = share of games that\n` +
    `ended because a player had no legal move (vs the grid filling).\n\n` +
    table(rows) +
    "\n";

  console.log(md);
  mkdirSync("sim-results", { recursive: true });
  writeFileSync("sim-results/report.md", md);
  writeFileSync("sim-results/report.json", JSON.stringify(rows, null, 2));
  console.log("\nwrote sim-results/report.md");
}

main();
