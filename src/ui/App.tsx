import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [teams, setTeams] = useState<[CreatureId[], CreatureId[]] | null>(null);
  const [seedCount, setSeedCount] = useState(6);
  const [sel, setSel] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const botRng = useRef(makeRng(98765));

  const start = useCallback(
    (t: [CreatureId[], CreatureId[]]) => {
      const rng = makeRng((Date.now() ^ (seedCount * 40503)) >>> 0);
      const seeds = generateSeeds(
        { size: SIZE, box: { rows: 3, cols: 3 } },
        seedCount,
        rng,
      );
      setGame(
        createGame({
          rules: { endScoring: "majority" },
          seeds,
          firstPlayer: 0,
          loadouts: [loadoutFromIds(t[0], SIZE), loadoutFromIds(t[1], SIZE)],
        }),
      );
      setTeams(t);
      setSel(null);
      setAuto(false);
    },
    [seedCount],
  );

  const commit = useCallback((g: GameState) => setGame(cloneState(g)), []);

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

  if (!game || !teams) {
    return (
      <Draft
        seedCount={seedCount}
        setSeedCount={setSeedCount}
        onStart={start}
      />
    );
  }

  return (
    <Play
      game={game}
      teams={teams}
      sel={sel}
      setSel={setSel}
      doAction={doAction}
      botMove={botMove}
      auto={auto}
      setAuto={setAuto}
      onNewDraft={() => {
        setGame(null);
        setTeams(null);
      }}
      onRematch={() => start(teams)}
    />
  );
}

/* ================================================================= *
 * Draft - snake pick from a shared pool, then assign to digits
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

  const step = picks[0].length + picks[1].length;
  const current = order[step] ?? 0;
  const takenBy = (id: CreatureId): 0 | 1 | null =>
    picks[0].includes(id) ? 0 : picks[1].includes(id) ? 1 : null;

  const pick = (id: CreatureId) => {
    if (stage !== "pick" || takenBy(id) !== null || step >= order.length) return;
    const next: [CreatureId[], CreatureId[]] = [
      picks[0].slice(),
      picks[1].slice(),
    ];
    next[current].push(id);
    setPicks(next);
    if (next[0].length + next[1].length === order.length) toAssign(next);
  };

  const autoRest = () => {
    const rng = makeRng((Date.now() ^ step) >>> 0);
    const next: [CreatureId[], CreatureId[]] = [
      picks[0].slice(),
      picks[1].slice(),
    ];
    let s = next[0].length + next[1].length;
    const taken = new Set([...next[0], ...next[1]]);
    while (s < order.length) {
      const avail = ALL_CREATURES.filter((c) => !taken.has(c));
      const choice = rng.pick(avail);
      taken.add(choice);
      next[order[s]].push(choice);
      s++;
    }
    setPicks(next);
    toAssign(next);
  };

  const toAssign = (p: [CreatureId[], CreatureId[]]) => {
    setAssigned([p[0].slice(), p[1].slice()]);
    setStage("assign");
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

  return (
    <div className="wrap">
      <h1>DENDOKU</h1>
      <p className="sub">
        A quiet contest over a shared grid. First, draft a team of nine
        critters from the shared meadow. Picks alternate and each critter goes
        to one team only, so the two teams always differ. Every critter changes
        how its digit behaves.
      </p>

      {stage === "pick" ? (
        <>
          <div className="draft-head">
            <span className="draft-turn">
              <span className={`dot p${current}`} /> {NAMES[current]} picks
            </span>
            <span className="draft-order">
              {order.map((o, i) => (
                <span
                  key={i}
                  className={
                    "pip " +
                    (i < step ? `done${o}` : "") +
                    (i === step ? " now" : "")
                  }
                />
              ))}
            </span>
            <button className="mini" onClick={autoRest} style={btnStyle}>
              auto-fill the rest
            </button>
          </div>

          <div className="cats">
            {CAT_ORDER.map((cat) => (
              <div key={cat} className="cat">
                <div className="cat-name" style={{ color: CATEGORIES[cat].hue }}>
                  {CATEGORIES[cat].name}
                  <span className="cat-tag">{CATEGORIES[cat].tagline}</span>
                </div>
                <div className="crlist">
                  {creaturesByCategory(cat).map((c) => {
                    const t = takenBy(c.id);
                    return (
                      <button
                        key={c.id}
                        className={`crcard ${t === 0 ? "taken0" : t === 1 ? "taken1" : ""}`}
                        disabled={t !== null}
                        onClick={() => pick(c.id)}
                      >
                        <Critter id={c.id} size={38} />
                        <div className="cr-name">
                          {c.name} <span>· {c.epithet}</span>
                        </div>
                        <div className="cr-blurb">{c.blurb}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
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
              <button onClick={() => setStage("pick")}>back to picking</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const btnStyle = { marginLeft: "auto" } as const;

/* ================================================================= *
 * Play
 * ================================================================= */

function Play({
  game,
  teams,
  sel,
  setSel,
  doAction,
  botMove,
  auto,
  setAuto,
  onNewDraft,
  onRematch,
}: {
  game: GameState;
  teams: [CreatureId[], CreatureId[]];
  sel: number | null;
  setSel: (n: number | null) => void;
  doAction: (a: Action) => void;
  botMove: () => void;
  auto: boolean;
  setAuto: (f: (a: boolean) => boolean) => void;
  onNewDraft: () => void;
  onRematch: () => void;
}) {
  const box = game.config.box;
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
            {playing ? (
              <div className="turn">
                <span className={`dot p${cur}`} />
                <span>
                  {NAMES[cur]} to move
                  {game.pendingExtra ? " · place again" : ""}
                </span>
              </div>
            ) : (
              <div className="banner">
                {game.winner === "draw"
                  ? "A level game."
                  : `${NAMES[game.winner as 0 | 1]} takes the match.`}{" "}
                <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>
                  (
                  {game.endReason === "no-legal-move"
                    ? "play froze"
                    : game.endReason === "stalled"
                      ? "the board stalled"
                      : "grid complete"}
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
                      {ROSTER[id].name}
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
