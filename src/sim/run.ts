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

type MatchMode = "single" | "bo2";

interface Scenario {
  config: BoardConfig;
  seedCount: number;
  endScoring: EndScoring;
  mode: MatchMode;
  botA: Bot;
  botB: Bot;
}

interface LegResult {
  score: [number, number];
  firstPlayer: Player;
  lastMover: Player | null;
  endReason: GameState["endReason"];
  plies: number;
}

function playLeg(sc: Scenario, firstPlayer: Player, seed: number): LegResult {
  const rng = makeRng(seed);
  const seeds = generateSeeds(sc.config, sc.seedCount, rng);
  const state = createGame({
    config: sc.config,
    rules: { endScoring: sc.endScoring },
    seeds,
    firstPlayer,
  });
  // seat 0 is always botA, seat 1 always botB; `firstPlayer` is who moves first
  const seatBots: [Bot, Bot] = [sc.botA, sc.botB];

  let guard = 0;
  const cap = sc.config.size * sc.config.size + 5;
  while (state.status === "playing" && guard++ < cap) {
    applyMove(state, seatBots[state.current].choose(state, rng));
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

interface MatchResult {
  /** aggregate winner across the match, from botA / botB perspective */
  winner: "A" | "B" | "draw";
  legs: LegResult[];
}

function playMatch(sc: Scenario, matchIndex: number): MatchResult {
  const legs: LegResult[] = [];
  const seedBase = 0x1000 + matchIndex * 2654435761;

  if (sc.mode === "single") {
    legs.push(playLeg(sc, (matchIndex % 2) as Player, seedBase));
  } else {
    legs.push(playLeg(sc, 0, seedBase));
    legs.push(playLeg(sc, 1, seedBase ^ 0x9e3779b9));
  }

  let a = 0;
  let b = 0;
  for (const leg of legs) {
    a += leg.score[0];
    b += leg.score[1];
  }
  return { winner: a === b ? "draw" : a > b ? "A" : "B", legs };
}

interface Aggregate {
  label: string;
  matches: number;
  aWins: number;
  bWins: number;
  draws: number;
  legs: number;
  legFirstWins: number;
  legSecondWins: number;
  legDraws: number;
  lastMoverWins: number;
  lastMoverDecided: number;
  stuck: number;
  pliesSum: number;
  marginSum: number;
}

function emptyAgg(label: string): Aggregate {
  return {
    label,
    matches: 0,
    aWins: 0,
    bWins: 0,
    draws: 0,
    legs: 0,
    legFirstWins: 0,
    legSecondWins: 0,
    legDraws: 0,
    lastMoverWins: 0,
    lastMoverDecided: 0,
    stuck: 0,
    pliesSum: 0,
    marginSum: 0,
  };
}

function pct(x: number, d: number): string {
  return d === 0 ? "  -  " : `${((100 * x) / d).toFixed(1)}%`;
}

function runScenario(sc: Scenario, matches: number): Aggregate {
  const label =
    `${sc.config.size}x${sc.config.size} | ${sc.endScoring} | ${sc.mode} | ` +
    `seeds=${sc.seedCount} | ${sc.botA.name}-v-${sc.botB.name}`;
  const agg = emptyAgg(label);
  for (let i = 0; i < matches; i++) {
    const m = playMatch(sc, i);
    agg.matches++;
    if (m.winner === "A") agg.aWins++;
    else if (m.winner === "B") agg.bWins++;
    else agg.draws++;

    for (const leg of m.legs) {
      agg.legs++;
      const [s0, s1] = leg.score;
      if (s0 === s1) agg.legDraws++;
      else if (leg.firstPlayer === (s0 > s1 ? 0 : 1)) agg.legFirstWins++;
      else agg.legSecondWins++;

      if (s0 !== s1 && leg.lastMover !== null) {
        agg.lastMoverDecided++;
        if (leg.lastMover === (s0 > s1 ? 0 : 1)) agg.lastMoverWins++;
      }
      if (leg.endReason === "no-legal-move") agg.stuck++;
      agg.pliesSum += leg.plies;
      agg.marginSum += Math.abs(s0 - s1);
    }
  }
  return agg;
}

function table(rows: Aggregate[]): string {
  const head =
    "| scenario | matches | A wins | B wins | match draw | leg 1st-mover W | last-mover W | stuck | avg plies | avg margin |";
  const sep = "|" + "---|".repeat(10);
  const body = rows.map(
    (a) =>
      `| ${a.label} | ${a.matches} | ${pct(a.aWins, a.matches)} | ${pct(
        a.bWins,
        a.matches,
      )} | ${pct(a.draws, a.matches)} | ${pct(
        a.legFirstWins,
        a.legFirstWins + a.legSecondWins,
      )} | ${pct(a.lastMoverWins, a.lastMoverDecided)} | ${pct(
        a.stuck,
        a.legs,
      )} | ${(a.pliesSum / a.legs).toFixed(1)} | ${(a.marginSum / a.legs).toFixed(
        2,
      )} |`,
  );
  return [head, sep, ...body].join("\n");
}

function main() {
  const MATCHES = Number(process.env.MATCHES ?? 2000);
  const rows: Aggregate[] = [];

  const configs = [CONFIG_9x9, CONFIG_6x6];
  const seedCounts = [1, 8];
  const matchups: Array<[Bot, Bot]> = [
    [bots.territory, bots.territory],
    [bots.territory, bots.random],
    [bots.mobility, bots.territory],
    [bots.mobility, bots.random],
  ];

  for (const config of configs) {
    for (const seedCount of seedCounts) {
      for (const mode of ["single", "bo2"] as const) {
        for (const [botA, botB] of matchups) {
          rows.push(
            runScenario(
              { config, seedCount, endScoring: "majority", mode, botA, botB },
              MATCHES,
            ),
          );
        }
      }
    }
  }

  const md =
    `# Dendoku milestone 2 — territory scoring\n\n` +
    `Matches per scenario: ${MATCHES}. endScoring = majority for all rows.\n` +
    `"single" = one leg, first move alternates by match. "bo2" = two legs\n` +
    `with first move swapped, aggregate region score decides the match.\n` +
    `"A wins" is from botA's perspective (first column of each matchup); a\n` +
    `value far from 50% in a mirror matchup = first-move advantage.\n\n` +
    table(rows) +
    "\n";

  console.log(md);
  mkdirSync("sim-results", { recursive: true });
  writeFileSync("sim-results/report-m2.md", md);
  writeFileSync("sim-results/report-m2.json", JSON.stringify(rows, null, 2));
  console.log("\nwrote sim-results/report-m2.md");
}

main();
