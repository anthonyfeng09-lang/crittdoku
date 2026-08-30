import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_ANIMALS,
  ANIMALS,
  Action,
  AnimalId,
  GameState,
  applyAction,
  cloneState,
  createGame,
  generateSeeds,
  lastTouchedCell,
  legalActions,
  loadoutFrom,
  projectedScore,
  regionLabel,
  territoryHolder,
} from "../engine";
import { makeRng } from "../engine/rng";
import { animalBot } from "../sim/bots";

const SIZE = 9;
const PLAYER_NAMES = ["Sage", "Clay"] as const;

function randomTeam(rng: ReturnType<typeof makeRng>): AnimalId[] {
  return rng.shuffle(ALL_ANIMALS.slice()).slice(0, SIZE);
}

export function App() {
  const [phase, setPhase] = useState<"draft" | "play">("draft");
  const [teams, setTeams] = useState<[AnimalId[], AnimalId[]]>(() => {
    const rng = makeRng(Date.now() >>> 0);
    return [randomTeam(rng), randomTeam(rng)];
  });
  const [seedCount, setSeedCount] = useState(6);
  const [game, setGame] = useState<GameState | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const botRng = useRef(makeRng(98765));

  const start = useCallback(() => {
    const rng = makeRng((Date.now() ^ (seedCount * 40503)) >>> 0);
    const seeds = generateSeeds({ size: SIZE, box: { rows: 3, cols: 3 } }, seedCount, rng);
    setGame(
      createGame({
        rules: { endScoring: "majority" },
        seeds,
        firstPlayer: 0,
        loadouts: [loadoutFrom(teams[0], SIZE), loadoutFrom(teams[1], SIZE)],
      }),
    );
    setSel(null);
    setAuto(false);
    setPhase("play");
  }, [teams, seedCount]);

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
    applyAction(game, animalBot.choose(game, botRng.current));
    commit(game);
    setSel(null);
  }, [game, commit]);

  useEffect(() => {
    if (!auto || !game || game.status !== "playing") return;
    const t = setTimeout(botMove, 280);
    return () => clearTimeout(t);
  }, [auto, game, botMove]);

  if (phase === "draft" || !game) {
    return (
      <Draft
        teams={teams}
        setTeams={setTeams}
        seedCount={seedCount}
        setSeedCount={setSeedCount}
        onStart={start}
      />
    );
  }

  return (
    <Board
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
        setPhase("draft");
      }}
      onRematch={start}
    />
  );
}

/* ------------------------------------------------------------------ */

function Draft({
  teams,
  setTeams,
  seedCount,
  setSeedCount,
  onStart,
}: {
  teams: [AnimalId[], AnimalId[]];
  setTeams: (t: [AnimalId[], AnimalId[]]) => void;
  seedCount: number;
  setSeedCount: (n: number) => void;
  onStart: () => void;
}) {
  const setSlot = (p: 0 | 1, digit: number, animal: AnimalId) => {
    const team = teams[p].slice();
    const existing = team.indexOf(animal);
    if (existing >= 0) team[existing] = team[digit - 1]; // swap to keep 9 distinct
    team[digit - 1] = animal;
    const next = teams.slice() as [AnimalId[], AnimalId[]];
    next[p] = team;
    setTeams(next);
  };
  const shuffle = (p: 0 | 1) => {
    const rng = makeRng((Date.now() + p) >>> 0);
    const next = teams.slice() as [AnimalId[], AnimalId[]];
    next[p] = rng.shuffle(ALL_ANIMALS.slice()).slice(0, SIZE);
    setTeams(next);
  };

  return (
    <div className="wrap">
      <h1>DENDOKU</h1>
      <p className="sub">
        Draft a team of nine animals, one bound to each digit. Each animal
        changes how that digit behaves. The two teams differ, so the same grid
        plays differently for each side.
      </p>

      <div className="draft">
        {([0, 1] as const).map((p) => (
          <div key={p} className="panel draft-col">
            <div className="turn">
              <span className={`dot p${p}`} /> {PLAYER_NAMES[p]}
              <button
                style={{ marginLeft: "auto" }}
                className="mini"
                onClick={() => shuffle(p)}
              >
                shuffle
              </button>
            </div>
            {Array.from({ length: SIZE }, (_, i) => {
              const digit = i + 1;
              const cur = teams[p][i];
              return (
                <div key={digit} className="slot">
                  <span className="slot-d">{digit}</span>
                  <select
                    value={cur}
                    onChange={(e) => setSlot(p, digit, e.target.value as AnimalId)}
                  >
                    {ALL_ANIMALS.map((a) => (
                      <option key={a} value={a}>
                        {ANIMALS[a].name} — {ANIMALS[a].epithet}
                      </option>
                    ))}
                  </select>
                  <span className="slot-blurb">{ANIMALS[cur].blurb}</span>
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
          <button onClick={onStart}>Start match</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Board({
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
  teams: [AnimalId[], AnimalId[]];
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

  const animalName = (cell: number) => {
    const d = game.grid[cell];
    const p = game.placedBy[cell];
    if (d === 0 || p < 0) return "";
    const id = teams[p][d - 1];
    return `${ANIMALS[id].name} · ${d}`;
  };

  const claimed = game.regions.filter((r) => r.claimedBy !== null);
  const cur = game.current;

  return (
    <div className="wrap">
      <h1>DENDOKU</h1>

      <div className="layout">
        <div
          className="board"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 44px)` }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, cell) => {
            const r = Math.floor(cell / SIZE);
            const c = cell % SIZE;
            const v = game.grid[cell];
            const mine = game.placedBy[cell];
            const selectable =
              playing &&
              (v === 0 ||
                mine === cur || // own cell (sparrow)
                (mine === (cur === 0 ? 1 : 0) &&
                  legalActions(game).some(
                    (a) => a.type === "place" && a.cell === cell,
                  )));
            const cls = [
              "cell",
              v !== 0 ? "filled" : "",
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
                title={animalName(cell)}
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
                  {PLAYER_NAMES[cur]} to move
                  {game.pendingExtra ? " — place again (Wren)" : ""}
                </span>
              </div>
            ) : (
              <div className="banner">
                {game.winner === "draw"
                  ? "A level game."
                  : `${PLAYER_NAMES[game.winner as 0 | 1]} takes the match.`}{" "}
                <span style={{ color: "var(--ink-soft)" }}>
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
                </span>
              ))}
            </div>

            {sel !== null && playing && (
              <div className="picker-wrap">
                <div className="hint">
                  {game.grid[sel] === 0
                    ? `cell r${Math.floor(sel / SIZE) + 1} c${(sel % SIZE) + 1}`
                    : `${animalName(sel)} — r${Math.floor(sel / SIZE) + 1} c${
                        (sel % SIZE) + 1
                      }`}
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
                          ? `Mole → ${a.digit}`
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
              <button onClick={onRematch}>Rematch</button>
              <button onClick={onNewDraft}>New draft</button>
              <button onClick={botMove} disabled={!playing}>
                Bot move
              </button>
              <button onClick={() => setAuto((x) => !x)} disabled={!playing}>
                {auto ? "Stop auto-play" : "Auto-play"}
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="teams">
              {([0, 1] as const).map((p) => (
                <div key={p}>
                  <div className="hint" style={{ marginTop: 0 }}>
                    <span className={`dot p${p}`} /> {PLAYER_NAMES[p]}
                  </div>
                  {teams[p].map((id, i) => (
                    <div key={i} className="team-row" title={ANIMALS[id].blurb}>
                      <b>{i + 1}</b> {ANIMALS[id].name}
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
                    {PLAYER_NAMES[rg.claimedBy as 0 | 1]}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
