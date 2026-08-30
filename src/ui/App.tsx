import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ALL_CREATURES,
  ROSTER,
  CATEGORIES,
  Category,
  Action,
  CreatureId,
  GameState,
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
  territoryHolder,
} from "../engine";
import { makeRng } from "../engine/rng";
import { critterBot } from "../sim/bots";
import { Critter } from "./Critter";

const SIZE = 9;
const NAMES = ["Sage", "Clay"] as const;
const CAT_ORDER: Category[] = ["anchor", "drift", "hush", "thrift", "ward", "snap"];

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

  if (!game || !match) {
    return (
      <Draft
        seedCount={seedCount}
        setSeedCount={setSeedCount}
        onStart={startMatch}
      />
    );
  }

  return (
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
      onNextLeg={() => beginLeg({ ...match, leg: 2 })}
      onNewDraft={() => {
        setGame(null);
        setMatch(null);
      }}
      onRematch={() => startMatch(match.draftTeams)}
    />
  );
}

/* ================================================================= *
 * Draft - one roster grid, alternating picks from the shared pool
 * ================================================================= */

function Draft({
  seedCount,
  setSeedCount,
  onStart,
}: {
  seedCount: number;
  setSeedCount: (n: number) => void;
  onStart: (t: [CreatureId[], CreatureId[]]) => void;
}) {
  const order = useMemo(() => snakeOrder(SIZE), []);
  const [picks, setPicks] = useState<[CreatureId[], CreatureId[]]>([[], []]);
  const [stage, setStage] = useState<"pick" | "assign">("pick");
  const [assigned, setAssigned] = useState<[CreatureId[], CreatureId[]]>([
    [],
    [],
  ]);
  const [filter, setFilter] = useState<Category | "all">("all");

  const step = picks[0].length + picks[1].length;
  const done = step >= order.length;
  const current = order[step] ?? 0;
  const takenBy = (id: CreatureId): 0 | 1 | null =>
    picks[0].includes(id) ? 0 : picks[1].includes(id) ? 1 : null;

  const toAssign = (p: [CreatureId[], CreatureId[]]) => {
    setAssigned([p[0].slice(), p[1].slice()]);
    setStage("assign");
  };

  const pick = (id: CreatureId) => {
    if (stage !== "pick" || takenBy(id) !== null || done) return;
    const next: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    next[current].push(id);
    setPicks(next);
    if (next[0].length + next[1].length === order.length) toAssign(next);
  };

  const autoRest = () => {
    const rng = makeRng((Date.now() ^ step) >>> 0);
    const next: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    const taken = new Set([...next[0], ...next[1]]);
    let s = taken.size;
    while (s < order.length) {
      const choice = rng.pick(ALL_CREATURES.filter((c) => !taken.has(c)));
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
      <div className="wrap">
        <h1>DENDOKU</h1>
        <p className="sub">
          Bind each of your drafted critters to a digit. That digit now plays
          the way the critter says, for you.
        </p>
        <div className="assign">
          {([0, 1] as const).map((p) => (
            <div key={p} className="panel">
              <div className="turn">
                <span className={`dot p${p}`} /> {NAMES[p]}: bind to digits
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
        </div>
        <div className="panel">
          <div className="controls">
            <label>
              seeded cells
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
            <button className="primary" onClick={() => onStart(assigned)}>
              Start match
            </button>
            <button onClick={() => setStage("pick")}>back to draft</button>
          </div>
        </div>
      </div>
    );
  }

  const shown =
    filter === "all" ? ALL_CREATURES.map((id) => ROSTER[id]) : creaturesByCategory(filter);

  return (
    <div className="wrap">
      <h1>DENDOKU</h1>
      <p className="sub">
        Draft nine critters from the roster. Picks alternate; each critter joins
        one team only. Then place digits on a shared grid where they can't repeat
        in a row, column, or box. When play freezes, every region goes to
        whoever holds the most of it.
      </p>

      <div className="draft-bar">
        <div className="draft-bar-top">
          <span className="draft-turn">
            <span className={`dot p${current}`} />
            {NAMES[current]} to pick &middot; {step}/{order.length}
          </span>
          <div className="controls" style={{ marginLeft: "auto" }}>
            <button onClick={undo} disabled={step === 0}>
              undo
            </button>
            <button onClick={autoRest}>auto-fill</button>
          </div>
        </div>
        <div className="tray">
          {([0, 1] as const).map((p) => (
            <div
              key={p}
              className={`tray-side ${current === p && !done ? "now" : ""}`}
            >
              <div className="turn" style={{ fontSize: 13 }}>
                <span className={`dot p${p}`} /> {NAMES[p]}
              </div>
              <div className="tray-slots">
                {Array.from({ length: SIZE }, (_, i) => (
                  <div
                    key={i}
                    className={`tray-slot ${picks[p][i] ? "filled" : ""}`}
                  >
                    {picks[p][i] && <Critter id={picks[p][i]} size={26} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="controls" style={{ marginBottom: 12 }}>
        <button
          className={filter === "all" ? "primary" : ""}
          onClick={() => setFilter("all")}
        >
          all
        </button>
        {CAT_ORDER.map((cat) => (
          <button
            key={cat}
            className={filter === cat ? "primary" : ""}
            onClick={() => setFilter(cat)}
            style={
              filter === cat
                ? { background: CATEGORIES[cat].hue, borderColor: "transparent" }
                : { color: CATEGORIES[cat].hue }
            }
          >
            {CATEGORIES[cat].element}
          </button>
        ))}
      </div>

      <div className="roster">
        {shown.map((c) => {
          const t = takenBy(c.id);
          return (
            <button
              key={c.id}
              className={`rcard ${
                t === 0 ? "taken0" : t === 1 ? "taken1" : t !== null ? "taken" : ""
              }`}
              disabled={t !== null || done}
              onClick={() => pick(c.id)}
              style={
                { "--tint": CATEGORIES[c.category].hue } as CSSProperties
              }
            >
              {t !== null && (
                <span
                  className="rc-owner"
                  style={{ background: t === 0 ? "var(--p0)" : "var(--p1)" }}
                >
                  {NAMES[t]}
                </span>
              )}
              <Critter id={c.id} size={52} />
              <div className="rc-name">{c.name}</div>
              <div className="rc-ep">{c.epithet}</div>
              <span
                className="type-chip"
                style={{ background: CATEGORIES[c.category].hue }}
              >
                {CATEGORIES[c.category].element}
              </span>
              <div className="rc-blurb">{c.blurb}</div>
            </button>
          );
        })}
      </div>
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

  return (
    <div className="wrap">
      <h1>DENDOKU</h1>

      <div className="layout">
        <div
          className="board"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 46px)` }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, cell) => {
            const r = Math.floor(cell / SIZE);
            const c = cell % SIZE;
            const v = game.grid[cell];
            const mine = game.placedBy[cell];
            const selectable =
              playing &&
              (v === 0 ||
                mine === cur ||
                legalActions(game).some(
                  (a) => a.type === "place" && a.cell === cell,
                ));
            const cls = [
              "cell",
              game.seeded[cell] ? "seeded" : "",
              game.dormant[cell] ? "dormant" : "",
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
                {v !== 0 ? v : ""}
                {cell === lastCell && <span className="just-placed" />}
              </button>
            );
          })}
        </div>

        <div className="side">
          <div className="panel">
            <div className="hint" style={{ marginTop: 0, marginBottom: 6 }}>
              Leg {match.leg} of 2 · Sage pilots{" "}
              {match.leg === 1 ? "the first team" : "the swapped team"}
              {match.legScores[0] &&
                ` · match so far ${agg[0]}–${agg[1]}`}
            </div>
            {playing ? (
              <div className="turn">
                <span className={`dot p${cur}`} />
                <span>
                  {NAMES[cur]} to move
                  {game.pendingExtra ? " · place again" : ""}
                </span>
              </div>
            ) : legOneOver ? (
              <div className="banner">
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
            ) : (
              <div className="banner">
                {agg[0] === agg[1]
                  ? "The match is level."
                  : `${NAMES[agg[0] > agg[1] ? 0 : 1]} takes the match, ${Math.max(
                      agg[0],
                      agg[1],
                    )}–${Math.min(agg[0], agg[1])}.`}{" "}
                <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>
                  (leg 2{" "}
                  {game.endReason === "no-legal-move"
                    ? "froze"
                    : game.endReason === "stalled"
                      ? "stalled"
                      : "filled"}
                  )
                </span>
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
            <div className="charges">
              {([0, 1] as const).map((p) => (
                <span key={p} className="s">
                  <span className={`dot p${p}`} />
                  {(["mole", "wren", "lark"] as const).map((ch) => (
                    <span
                      key={ch}
                      className={`chip ${game.charges[p][ch] ? "on" : "off"}`}
                    >
                      {ch}
                    </span>
                  ))}
                  <span
                    className={`chip ${game.charges[p].hops > 0 ? "on" : "off"}`}
                  >
                    hop ×{game.charges[p].hops}
                  </span>
                  {game.skipNext[p] && <span className="chip off">skip</span>}
                </span>
              ))}
            </div>

            {sel !== null && playing && (
              <div className="picker-wrap">
                <div className="hint" style={{ marginTop: 0 }}>
                  {game.grid[sel] === 0
                    ? `cell r${Math.floor(sel / SIZE) + 1} c${(sel % SIZE) + 1}`
                    : creatureLabel(sel)}
                </div>
                <div className="picker">
                  {selActions.length === 0 && (
                    <span className="hint">nothing legal here</span>
                  )}
                  {selActions.map((a, i) => (
                    <button key={i} onClick={() => doAction(a)}>
                      {a.type === "move"
                        ? `hop → r${Math.floor(a.to / SIZE) + 1} c${(a.to % SIZE) + 1}`
                        : game.grid[a.cell] !== 0
                          ? `remove → ${a.digit}`
                          : a.wild
                            ? `✦ ${a.digit}`
                            : `${a.digit}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="controls">
              <button className="primary" onClick={onRematch}>
                Rematch
              </button>
              <button onClick={onNewDraft}>New draft</button>
              <button onClick={botMove} disabled={!playing}>
                Bot move
              </button>
              <button onClick={() => setAuto((x) => !x)} disabled={!playing}>
                {auto ? "Stop" : "Auto-play"}
              </button>
            </div>
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
      </div>
    </div>
  );
}
