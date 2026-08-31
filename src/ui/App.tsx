import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ABILITY_COST,
  ALL_CREATURES,
  ROSTER,
  CATEGORIES,
  Category,
  Action,
  CreatureId,
  GameState,
  Player,
  applyAction,
  cloneState,
  createGame,
  creaturesByCategory,
  generateSeeds,
  lastTouchedCell,
  legalActions,
  loadoutFromIds,
  projectedScore,
  regionLabel,
  snakeOrder,
  teamHas,
  territoryHolder,
} from "../engine";
import { makeRng } from "../engine/rng";
import { critterBot } from "../sim/bots";
import { Critter } from "./Critter";
import { MeadowScene } from "./Meadow";

const SIZE = 9;
const NAMES = ["Sage", "Clay"] as const;
const MEADOW_SIZE = 8;
const FORAGE_TOKENS = 3;
const REROLL_COST = 1;
const CAT_ORDER: Category[] = [
  "anchor",
  "drift",
  "hush",
  "thrift",
  "ward",
  "snap",
];
const rc = (cell: number) => `r${Math.floor(cell / SIZE) + 1}c${(cell % SIZE) + 1}`;

interface AbilityInfo {
  name: string;
  label: string;
  cost: number;
  help: string;
}

/** which abilities a player's team can use, with prices */
function teamAbilities(g: GameState, p: Player): AbilityInfo[] {
  const out: AbilityInfo[] = [];
  if (teamHas(g, p, "moveAdjacent"))
    out.push({ name: "hop", label: "hop", cost: ABILITY_COST.hop, help: "move one of your cells to a neighbour" });
  if (teamHas(g, p, "canBurst"))
    out.push({ name: "extra", label: "burst", cost: ABILITY_COST.extra, help: "place a second digit this turn" });
  if (teamHas(g, p, "canWild"))
    out.push({ name: "wild", label: "wild", cost: ABILITY_COST.wild, help: "place ignoring the row/col/box rule" });
  if (teamHas(g, p, "canMole"))
    out.push({ name: "replace", label: "remove", cost: ABILITY_COST.replace, help: "remove an opponent digit in a contested region" });
  if (teamHas(g, p, "canMine"))
    out.push({ name: "mine", label: "mine", cost: ABILITY_COST.mine, help: "block a cell until the opponent clears it" });
  return out;
}

function actionLabel(a: Action): string {
  switch (a.type) {
    case "move":
      return `hop → ${rc(a.to)}  ${ABILITY_COST.hop}⚡`;
    case "mine":
      return `mine ${rc(a.cell)}  ${ABILITY_COST.mine}⚡`;
    case "clear":
      return `clear mine  ${ABILITY_COST.clear}⚡`;
    default:
      if (a.burst) return `${a.digit} + burst  ${ABILITY_COST.extra}⚡`;
      if (a.wild) return `✦ ${a.digit}  ${ABILITY_COST.wild}⚡`;
      return `${a.digit}`;
  }
}

function actionHelp(a: Action): string {
  if (a.type === "place" && "digit" in a && !a.wild && !a.burst) {
    return "place this digit";
  }
  if (a.type === "place" && a.burst) return "place, then place again this turn";
  if (a.type === "place" && a.wild) return "wild placement, ignores the rules";
  if (a.type === "place") return "remove the opponent digit here";
  return "";
}

interface Match {
  /** the two drafted teams, index 0 = first picker's team */
  draftTeams: [CreatureId[], CreatureId[]];
  seedCount: number;
  leg: 1 | 2;
  /** [legIndex] -> [seat0 regions, seat1 regions] once that leg has ended */
  legScores: Array<[number, number] | null>;
}

/** In leg 1 seat 0 pilots team A and moves first. In leg 2 the teams swap
 *  and seat 1 moves first, so each player pilots each team once and any
 *  draft-order or team-strength edge cancels over the match. */
function legLoadouts(m: Match): [CreatureId[], CreatureId[]] {
  return m.leg === 1 ? m.draftTeams : [m.draftTeams[1], m.draftTeams[0]];
}

export function App() {
  const [match, setMatch] = useState<Match | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [seedCount, setSeedCount] = useState(6);
  const [sel, setSel] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const botRng = useRef(makeRng(98765));

  const beginLeg = useCallback((m: Match) => {
    const rng = makeRng((Date.now() ^ (m.seedCount * 40503) ^ m.leg) >>> 0);
    const seeds = generateSeeds(
      { size: SIZE, box: { rows: 3, cols: 3 } },
      m.seedCount,
      rng,
    );
    const t = legLoadouts(m);
    setGame(
      createGame({
        rules: { endScoring: "majority" },
        seeds,
        firstPlayer: m.leg === 1 ? 0 : 1,
        loadouts: [loadoutFromIds(t[0], SIZE), loadoutFromIds(t[1], SIZE)],
      }),
    );
    setMatch(m);
    setSel(null);
    setAuto(false);
  }, []);

  const startMatch = useCallback(
    (draftTeams: [CreatureId[], CreatureId[]]) =>
      beginLeg({
        draftTeams,
        seedCount,
        leg: 1,
        legScores: [null, null],
      }),
    [beginLeg, seedCount],
  );

  const commit = useCallback(
    (g: GameState) => {
      setGame(cloneState(g));
      if (g.status === "ended" && match && match.legScores[match.leg - 1] === null) {
        const ls = match.legScores.slice() as Match["legScores"];
        ls[match.leg - 1] = [g.score[0], g.score[1]];
        setMatch({ ...match, legScores: ls });
      }
    },
    [match],
  );

  const doAction = useCallback(
    (a: Action) => {
      if (!game || game.status !== "playing") return;
      applyAction(game, a);
      commit(game);
      setSel(null);
    },
    [game, commit],
  );

  const botMove = useCallback(() => {
    if (!game || game.status !== "playing") return;
    applyAction(game, critterBot.choose(game, botRng.current));
    commit(game);
    setSel(null);
  }, [game, commit]);

  useEffect(() => {
    if (!auto || !game || game.status !== "playing") return;
    const t = setTimeout(botMove, 280);
    return () => clearTimeout(t);
  }, [auto, game, botMove]);

  const [dex, setDex] = useState(false);
  const openDex = useCallback(() => setDex(true), []);

  const screen =
    !game || !match ? (
      <Draft
        seedCount={seedCount}
        setSeedCount={setSeedCount}
        onStart={startMatch}
        onOpenDex={openDex}
      />
    ) : (
      <Play
        game={game}
        teams={legLoadouts(match)}
        match={match}
        sel={sel}
        setSel={setSel}
        doAction={doAction}
        botMove={botMove}
        auto={auto}
        setAuto={setAuto}
        onOpenDex={openDex}
        onNextLeg={() => beginLeg({ ...match, leg: 2 })}
        onNewDraft={() => {
          setGame(null);
          setMatch(null);
        }}
        onRematch={() => startMatch(match.draftTeams)}
      />
    );

  return (
    <>
      {screen}
      {dex && <Dex onClose={() => setDex(false)} />}
    </>
  );
}

/* ================================================================= *
 * Critterdex - every creature and what it does
 * ================================================================= */

function Dex({ onClose }: { onClose: () => void }) {
  return (
    <div className="dex-overlay" onClick={onClose}>
      <div
        className="dex"
        role="dialog"
        aria-label="Critterdex"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dex-head">
          <h2>Critterdex</h2>
          <span className="hint" style={{ margin: 0 }}>
            {ALL_CREATURES.length} critters &middot; six types
          </span>
          <button className="primary" style={{ marginLeft: "auto" }} onClick={onClose}>
            close
          </button>
        </div>
        <div className="dex-body">
          {CAT_ORDER.map((cat) => (
            <section key={cat} className="dex-section">
              <h3 style={{ color: CATEGORIES[cat].hue }}>
                <span
                  className="type-chip"
                  style={{ background: CATEGORIES[cat].hue }}
                >
                  {CATEGORIES[cat].element}
                </span>
                {CATEGORIES[cat].name}
                <span className="dex-tagline">{CATEGORIES[cat].tagline}</span>
              </h3>
              <div className="dex-grid">
                {creaturesByCategory(cat).map((c) => (
                  <div key={c.id} className="dex-card">
                    <Critter id={c.id} size={72} />
                    <div className="dex-info">
                      <div className="dex-name">{c.name}</div>
                      <div className="dex-ep">{c.epithet}</div>
                      <div className="dex-blurb">{c.blurb}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================= *
 * Draft - a wildlife meadow. On your turn a handful of creatures are
 * out in the grass; pick one, or spend a forage token to call a fresh
 * set. Picks are exclusive and alternate in snake order.
 * ================================================================= */

function Draft({
  seedCount,
  setSeedCount,
  onStart,
  onOpenDex,
}: {
  seedCount: number;
  setSeedCount: (n: number) => void;
  onStart: (t: [CreatureId[], CreatureId[]]) => void;
  onOpenDex: () => void;
}) {
  const order = useMemo(() => snakeOrder(SIZE), []);
  const rng = useRef(makeRng((Date.now() >>> 0) || 1));
  const [picks, setPicks] = useState<[CreatureId[], CreatureId[]]>([[], []]);
  const [forage, setForage] = useState<[number, number]>([
    FORAGE_TOKENS,
    FORAGE_TOKENS,
  ]);
  // one shared patch of grass; a slice of the roster is out at any time
  const [meadow, setMeadow] = useState<CreatureId[]>(() =>
    rng.current.shuffle(ALL_CREATURES.slice()).slice(0, MEADOW_SIZE),
  );
  const undoStack = useRef<
    Array<{ meadow: CreatureId[]; forage: [number, number] }>
  >([]);
  const [stage, setStage] = useState<"pick" | "assign">("pick");
  const [assigned, setAssigned] = useState<[CreatureId[], CreatureId[]]>([
    [],
    [],
  ]);

  const step = picks[0].length + picks[1].length;
  const done = step >= order.length;
  const current = order[step] ?? 0;

  // roster still in the wild: not drafted, not currently out in the meadow
  const wild = useMemo(() => {
    const used = new Set<CreatureId>([...picks[0], ...picks[1], ...meadow]);
    return ALL_CREATURES.filter((id) => !used.has(id));
  }, [picks, meadow]);

  const toAssign = (p: [CreatureId[], CreatureId[]]) => {
    setAssigned([p[0].slice(), p[1].slice()]);
    setStage("assign");
  };

  const pick = (id: CreatureId) => {
    if (stage !== "pick" || done || !meadow.includes(id)) return;
    undoStack.current.push({
      meadow: meadow.slice(),
      forage: [forage[0], forage[1]],
    });
    const next: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    next[current].push(id);
    // the grass fills back in behind the one you took
    const refill = wild.length ? rng.current.pick(wild) : null;
    setMeadow(meadow.flatMap((m) => (m === id ? (refill ? [refill] : []) : [m])));
    setPicks(next);
    if (next[0].length + next[1].length === order.length) toAssign(next);
  };

  const reroll = () => {
    if (done || forage[current] < REROLL_COST) return;
    // whole pool slips under; a fresh set surfaces from the wild pile
    const fresh = rng.current.shuffle(wild.slice()).slice(0, MEADOW_SIZE);
    if (fresh.length < MEADOW_SIZE) {
      fresh.push(
        ...rng.current
          .shuffle(meadow.slice())
          .slice(0, MEADOW_SIZE - fresh.length),
      );
    }
    const f: [number, number] = [forage[0], forage[1]];
    f[current] -= REROLL_COST;
    setForage(f);
    setMeadow(fresh);
  };

  const autoRest = () => {
    const next: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    const taken = new Set<CreatureId>([...next[0], ...next[1]]);
    let s = taken.size;
    while (s < order.length) {
      const choice = rng.current.pick(ALL_CREATURES.filter((c) => !taken.has(c)));
      taken.add(choice);
      next[order[s]].push(choice);
      s++;
    }
    setPicks(next);
    toAssign(next);
  };

  const undo = () => {
    if (step === 0) return;
    const last = order[step - 1];
    const next: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    next[last].pop();
    setPicks(next);
    const snap = undoStack.current.pop();
    if (snap) {
      setMeadow(snap.meadow);
      setForage(snap.forage);
    }
  };

  const setSlot = (p: 0 | 1, digit: number, id: CreatureId) => {
    const arr = assigned[p].slice();
    const cur = arr[digit - 1];
    const other = arr.indexOf(id);
    if (other >= 0) arr[other] = cur;
    arr[digit - 1] = id;
    const next: [CreatureId[], CreatureId[]] = [
      assigned[0].slice(),
      assigned[1].slice(),
    ];
    next[p] = arr;
    setAssigned(next);
  };

  if (stage === "assign") {
    return (
      <div className="app">
        <div className="appbar">
          <h1>DENDOKU</h1>
          <span className="status">bind each critter to a digit</span>
          <div className="controls" style={{ marginLeft: "auto" }}>
            <label>
              seeds
              <select
                value={seedCount}
                onChange={(e) => setSeedCount(Number(e.target.value))}
              >
                {[0, 1, 3, 6, 10, 16].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={onOpenDex}>Critterdex</button>
            <button onClick={() => setStage("pick")}>back</button>
            <button className="primary" onClick={() => onStart(assigned)}>
              Start match
            </button>
          </div>
        </div>
        <main className="stage assign">
          {([0, 1] as const).map((p) => (
            <div key={p} className="panel">
              <div className="turn">
                <span className={`dot p${p}`} /> {NAMES[p]}
              </div>
              {Array.from({ length: SIZE }, (_, i) => {
                const digit = i + 1;
                const id = assigned[p][i];
                return (
                  <div key={digit} className="slot">
                    <span className="slot-d">{digit}</span>
                    <Critter id={id} size={30} />
                    <select
                      value={id}
                      onChange={(e) =>
                        setSlot(p, digit, e.target.value as CreatureId)
                      }
                    >
                      {assigned[p].map((cid) => (
                        <option key={cid} value={cid}>
                          {ROSTER[cid].name}
                        </option>
                      ))}
                    </select>
                    <span className="slot-blurb">{ROSTER[id].blurb}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="appbar">
        <h1>DENDOKU</h1>
        <span className="status">
          <span className={`dot p${current}`} />
          {NAMES[current]} drafts &middot; {step}/{order.length}
        </span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button onClick={onOpenDex}>Critterdex</button>
          <button onClick={undo} disabled={step === 0}>
            undo
          </button>
          <button onClick={autoRest}>auto-fill</button>
        </div>
      </div>

      <div className="draftstrip">
        {([0, 1] as const).map((p) => (
          <div
            key={p}
            className={`tray-side ${current === p && !done ? "now" : ""}`}
          >
            <span className={`dot p${p}`} />
            <div className="tray-slots">
              {Array.from({ length: SIZE }, (_, i) => (
                <div
                  key={i}
                  className={`tray-slot ${picks[p][i] ? "filled" : ""}`}
                  title={picks[p][i] ? ROSTER[picks[p][i]].name : ""}
                >
                  {picks[p][i] && <Critter id={picks[p][i]} size={22} />}
                </div>
              ))}
            </div>
            <span className="forage-count" title="forage tokens left">
              {"◆".repeat(forage[p])}
              {"◇".repeat(FORAGE_TOKENS - forage[p])}
            </span>
          </div>
        ))}
      </div>

      <main className="stage meadow-stage">
        {done ? (
          <div className="meadow">
            <div className="meadow-tag" style={{ background: "var(--ink)" }}>
              teams are set
            </div>
          </div>
        ) : (
          <MeadowScene
            options={meadow}
            onPick={pick}
            onReroll={reroll}
            rerollCost={REROLL_COST}
            forageLeft={forage[current]}
            disabled={done}
            ownerName={NAMES[current]}
            tint={current === 0 ? "var(--p0)" : "var(--p1)"}
          />
        )}
      </main>
    </div>
  );
}

/* ================================================================= *
 * Play
 * ================================================================= */

function Play({
  game,
  teams,
  match,
  sel,
  setSel,
  doAction,
  botMove,
  auto,
  setAuto,
  onOpenDex,
  onNextLeg,
  onNewDraft,
  onRematch,
}: {
  game: GameState;
  teams: [CreatureId[], CreatureId[]];
  match: Match;
  sel: number | null;
  setSel: (n: number | null) => void;
  doAction: (a: Action) => void;
  botMove: () => void;
  auto: boolean;
  setAuto: (f: (a: boolean) => boolean) => void;
  onOpenDex: () => void;
  onNextLeg: () => void;
  onNewDraft: () => void;
  onRematch: () => void;
}) {
  const box = game.config.box;
  // aggregate match score (seat 0 / seat 1) across finished legs
  const agg: [number, number] = [0, 0];
  for (const ls of match.legScores) {
    if (ls) {
      agg[0] += ls[0];
      agg[1] += ls[1];
    }
  }
  const legOneOver = match.leg === 1 && game.status === "ended";
  const live = projectedScore(game);
  const lastCell = lastTouchedCell(game);
  const playing = game.status === "playing";
  const cur = game.current;

  const selActions = useMemo(() => {
    if (sel === null || !playing) return [] as Action[];
    return legalActions(game).filter((a) =>
      a.type === "move" ? a.from === sel : a.cell === sel,
    );
  }, [sel, game, playing]);

  const cellTint = useMemo(() => {
    const out: string[] = [];
    for (let cell = 0; cell < SIZE * SIZE; cell++) {
      let claim = 0;
      let lead = 0;
      for (let k = 0; k < 3; k++) {
        const region = game.regions[game.cellRegions[cell * 3 + k]];
        if (region.claimedBy === 0) claim |= 1;
        else if (region.claimedBy === 1) claim |= 2;
        const h = territoryHolder(game, region);
        if (h === 0) lead |= 1;
        else if (h === 1) lead |= 2;
      }
      const m = claim || lead;
      out.push(
        (m === 1 ? "t0" : m === 2 ? "t1" : m === 3 ? "t01" : "") +
          (claim && m ? " tstrong" : ""),
      );
    }
    return out;
  }, [game]);

  const creatureLabel = (cell: number) => {
    const d = game.grid[cell];
    const p = game.placedBy[cell];
    if (d === 0 || p < 0) return "";
    return `${ROSTER[teams[p][d - 1]].name} · ${d}`;
  };

  const claimed = game.regions.filter((r) => r.claimedBy !== null);

  const matchLine =
    game.status !== "playing"
      ? legOneOver
        ? `Leg 1 done ${game.score[0]}–${game.score[1]}`
        : `${agg[0] === agg[1] ? "Level" : NAMES[agg[0] > agg[1] ? 0 : 1] + " wins"} ${Math.max(agg[0], agg[1])}–${Math.min(agg[0], agg[1])}`
      : `Leg ${match.leg}/2 · ${NAMES[cur]} to move${
          match.legScores[0] ? ` · match ${agg[0]}–${agg[1]}` : ""
        }`;

  return (
    <div className="app">
      <div className="appbar">
        <h1>DENDOKU</h1>
        <span className="status">
          <span className={`dot p${cur}`} />
          {matchLine}
        </span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button onClick={botMove} disabled={!playing}>
            Bot move
          </button>
          <button onClick={() => setAuto((x) => !x)} disabled={!playing}>
            {auto ? "Stop" : "Auto-play"}
          </button>
          <button onClick={onOpenDex}>Critterdex</button>
          <button onClick={onRematch}>Rematch</button>
          <button onClick={onNewDraft}>New draft</button>
        </div>
      </div>

      <main className="stage play">
        <div className="board-col">
        <div className="board">
          {Array.from({ length: SIZE * SIZE }, (_, cell) => {
            const r = Math.floor(cell / SIZE);
            const c = cell % SIZE;
            const v = game.grid[cell];
            const owner = game.placedBy[cell];
            const mineOwner = game.mines[cell];
            const selectable =
              playing &&
              (mineOwner !== -1 ||
                v === 0 ||
                owner === cur ||
                legalActions(game).some(
                  (a) =>
                    (a.type === "place" || a.type === "mine") && a.cell === cell,
                ));
            const cls = [
              "cell",
              game.seeded[cell] ? "seeded" : "",
              game.dormant[cell] ? "dormant" : "",
              mineOwner !== -1 ? `mine mine${mineOwner}` : "",
              sel === cell ? "sel" : "",
              cellTint[cell],
              (c + 1) % box.cols === 0 && c < SIZE - 1 ? "box-r" : "",
              (r + 1) % box.rows === 0 && r < SIZE - 1 ? "box-b" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={cell}
                className={cls}
                title={creatureLabel(cell)}
                disabled={!selectable}
                onClick={() => setSel(sel === cell ? null : cell)}
              >
                {v !== 0 ? v : mineOwner !== -1 ? "◆" : ""}
                {cell === lastCell && <span className="just-placed" />}
              </button>
            );
          })}
        </div>
        </div>

        <div className="info-col">
          <div className="panel">
            {legOneOver && (
              <div className="banner" style={{ marginBottom: 10 }}>
                Leg 1: Sage {game.score[0]}, Clay {game.score[1]}. Teams swap
                for leg 2.{" "}
                <button
                  className="primary"
                  style={{ marginLeft: 6 }}
                  onClick={onNextLeg}
                >
                  Play leg 2
                </button>
              </div>
            )}
            {!playing && !legOneOver && (
              <div className="banner" style={{ marginBottom: 10 }}>
                {agg[0] === agg[1]
                  ? "The match is level."
                  : `${NAMES[agg[0] > agg[1] ? 0 : 1]} takes the match, ${Math.max(
                      agg[0],
                      agg[1],
                    )}–${Math.min(agg[0], agg[1])}.`}
              </div>
            )}
            {playing && game.pendingExtra && (
              <div className="banner" style={{ marginBottom: 10 }}>
                {NAMES[cur]}: place your burst digit.
              </div>
            )}

            <div className="scores">
              <div className="s">
                <span className="dot p0" /> Sage{" "}
                <b>{playing ? live[0] : game.score[0]}</b>
              </div>
              <div className="s">
                <span className="dot p1" /> Clay{" "}
                <b>{playing ? live[1] : game.score[1]}</b>
              </div>
              <div className="s" style={{ alignSelf: "center" }}>
                of {game.regions.length}
              </div>
            </div>
            <div className="hint" style={{ marginTop: 4 }}>
              {playing ? "regions if play froze now" : "final"} · energy{" "}
              {game.energy[0]} / {game.energy[1]}
            </div>
            <div className="abilities">
              {([0, 1] as const).map((p) => {
                const list = teamAbilities(game, p);
                return (
                  <div key={p} className="ab-row">
                    <span className={`dot p${p}`} />
                    {list.length === 0 && (
                      <span className="hint" style={{ margin: 0 }}>
                        no abilities
                      </span>
                    )}
                    {list.map((ab) => (
                      <span
                        key={ab.name}
                        className={`chip ${
                          game.energy[p] >= ab.cost ? "on" : "off"
                        }`}
                        title={ab.help}
                      >
                        {ab.label} {ab.cost}⚡
                      </span>
                    ))}
                    {game.mines.some((m) => m === p) && (
                      <span className="chip mine-chip">
                        {game.mines.filter((m) => m === p).length} mines
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {sel !== null && playing && (
              <div className="picker-wrap">
                <div className="hint" style={{ marginTop: 0 }}>
                  {game.mines[sel] !== -1
                    ? `mine (${NAMES[game.mines[sel] as 0 | 1]})`
                    : game.grid[sel] === 0
                      ? `cell r${Math.floor(sel / SIZE) + 1} c${(sel % SIZE) + 1}`
                      : creatureLabel(sel)}
                </div>
                <div className="picker">
                  {selActions.length === 0 && (
                    <span className="hint">nothing legal here</span>
                  )}
                  {selActions.map((a, i) => (
                    <button key={i} onClick={() => doAction(a)} title={actionHelp(a)}>
                      {actionLabel(a)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="teams">
              {([0, 1] as const).map((p) => (
                <div key={p}>
                  <div className="hint" style={{ marginTop: 0 }}>
                    <span className={`dot p${p}`} /> {NAMES[p]}
                  </div>
                  {teams[p].map((id, i) => (
                    <div key={i} className="team-row" title={ROSTER[id].blurb}>
                      <b>{i + 1}</b>
                      <Critter id={id} size={22} />
                      <span style={{ flex: 1 }}>{ROSTER[id].name}</span>
                      <span
                        className="type-chip sm"
                        style={{
                          background: CATEGORIES[ROSTER[id].category].hue,
                        }}
                      >
                        {CATEGORIES[ROSTER[id].category].element}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="hint" style={{ marginTop: 0, marginBottom: 6 }}>
              Locked regions
            </div>
            <div className="log">
              {claimed.length === 0 && <div>none yet</div>}
              {claimed
                .slice()
                .sort((a, b) => (a.claimedOnTurn ?? 0) - (b.claimedOnTurn ?? 0))
                .map((rg) => (
                  <div key={rg.id}>
                    turn {rg.claimedOnTurn}: {regionLabel(rg)} →{" "}
                    {NAMES[rg.claimedBy as 0 | 1]}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
