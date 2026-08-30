import { writeFileSync, mkdirSync } from "node:fs";
import {
  CONFIG_9x9,
  GameState,
  Loadout,
  Player,
  applyAction,
  archetypeLoadout,
  createGame,
  generateSeeds,
  randomLoadout,
} from "../engine";
import { ARCHETYPES } from "../engine/animals";
import { makeRng } from "../engine/rng";
import { Bot, bots } from "./bots";

type LoadoutSpec = keyof typeof ARCHETYPES | "random" | "mirror-random";

interface Scenario {
  seedCount: number;
  loadoutA: LoadoutSpec;
  loadoutB: LoadoutSpec;
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

function loadoutsFor(sc: Scenario, rng: ReturnType<typeof makeRng>): [Loadout, Loadout] {
  const one = (spec: LoadoutSpec): Loadout =>
    spec === "random" || spec === "mirror-random"
      ? randomLoadout(9, rng)
      : archetypeLoadout(spec, 9);
  if (sc.loadoutA === "mirror-random") {
    const l = randomLoadout(9, rng);
    return [l, l];
  }
  return [one(sc.loadoutA), one(sc.loadoutB)];
}

function playLeg(sc: Scenario, firstPlayer: Player, seed: number): LegResult {
  const rng = makeRng(seed);
  const loadouts = loadoutsFor(sc, rng);
  const seeds = generateSeeds(CONFIG_9x9, sc.seedCount, rng);
  const state = createGame({
    config: CONFIG_9x9,
    rules: { endScoring: "majority" },
    seeds,
    firstPlayer,
    loadouts,
  });
  const seat: [Bot, Bot] = [sc.botA, sc.botB];
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

const pct = (x: number, d: number) => (d === 0 ? "  -  " : `${((100 * x) / d).toFixed(1)}%`);

function run(sc: Scenario, legs: number): Agg {
  const label = `${sc.loadoutA} -v- ${sc.loadoutB} | ${sc.botA.name}-v-${sc.botB.name} | seeds=${sc.seedCount}`;
  const agg = emptyAgg(label);
  for (let i = 0; i < legs; i++) {
    record(agg, playLeg(sc, (i % 2) as Player, 0x2000 + i * 2654435761));
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
  const LEGS = Number(process.env.LEGS ?? 1500);
  const rows: Agg[] = [];
  const arche = Object.keys(ARCHETYPES) as Array<keyof typeof ARCHETYPES>;

  const A = bots.animal;
  // 1. skill check + baseline end-reason distribution
  rows.push(run({ seedCount: 6, loadoutA: "mirror-random", loadoutB: "mirror-random", botA: A, botB: bots["random+"] }, LEGS));
  rows.push(run({ seedCount: 6, loadoutA: "random", loadoutB: "random", botA: A, botB: A }, LEGS));

  // 2. archetype balance: every mirror + every ordered asymmetric pair once
  for (const a of arche) {
    rows.push(run({ seedCount: 6, loadoutA: a, loadoutB: a, botA: A, botB: A }, LEGS));
  }
  for (let i = 0; i < arche.length; i++) {
    for (let j = i + 1; j < arche.length; j++) {
      rows.push(
        run({ seedCount: 6, loadoutA: arche[i], loadoutB: arche[j], botA: A, botB: A }, LEGS),
      );
    }
  }

  const md =
    `# Dendoku milestone 3 — animals & drafting\n\n` +
    `Legs per scenario: ${LEGS}. 9x9, endScoring=majority, seeds=6.\n` +
    `First move alternates each leg. "A wins" is the first-named loadout.\n` +
    `A big skew in an asymmetric archetype row = that loadout dominates.\n` +
    `Mirror rows (same archetype both sides) should sit near 40/40/20.\n\n` +
    `Archetype teams (digit 1..9):\n` +
    arche.map((k) => `- **${k}**: ${ARCHETYPES[k].join(", ")}`).join("\n") +
    `\n\n` +
    table(rows) +
    "\n";

  console.log(md);
  mkdirSync("sim-results", { recursive: true });
  writeFileSync("sim-results/report-m3.md", md);
  writeFileSync("sim-results/report-m3.json", JSON.stringify(rows, null, 2));
  console.log("\nwrote sim-results/report-m3.md");
}

main();
