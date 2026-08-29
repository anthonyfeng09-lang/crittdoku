import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardConfig,
  CONFIG_6x6,
  CONFIG_9x9,
  EndScoring,
  GameState,
  applyMove,
  cloneState,
  createGame,
  generateSeeds,
  isLegal,
  projectedScore,
  regionLabel,
  territoryHolder,
} from "../engine";
import { makeRng } from "../engine/rng";
import { territoryBot } from "../sim/bots";

type Size = "9" | "6";

function newGame(size: Size, seedCount: number, endScoring: EndScoring): GameState {
  const config: BoardConfig = size === "9" ? CONFIG_9x9 : CONFIG_6x6;
  const rng = makeRng((Date.now() ^ (seedCount * 2654435761)) >>> 0);
  const seeds = generateSeeds(config, seedCount, rng);
  return createGame({ config, rules: { endScoring }, seeds, firstPlayer: 0 });
}

export function App() {
  const [size, setSize] = useState<Size>("9");
  const [seedCount, setSeedCount] = useState(6);
  const [scoring, setScoring] = useState<EndScoring>("majority");
  const [game, setGame] = useState<GameState>(() =>
    newGame("9", 6, "majority"),
  );
  const [sel, setSel] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const botRng = useRef(makeRng(12345));

  const size_ = game.config.size;
  const box = game.config.box;

  const reset = useCallback(
    (s: Size = size, sc: number = seedCount, sco: EndScoring = scoring) => {
      setGame(newGame(s, sc, sco));
      setSel(null);
      setAuto(false);
    },
    [size, seedCount, scoring],
  );

  const commit = useCallback((next: GameState) => {
    setGame(cloneState(next));
  }, []);

  const play = useCallback(
    (cell: number, digit: number) => {
      if (game.status !== "playing" || !isLegal(game, cell, digit)) return;
      applyMove(game, { cell, digit });
      commit(game);
      setSel(null);
    },
    [game, commit],
  );

  const botMove = useCallback(() => {
    if (game.status !== "playing") return;
    applyMove(game, territoryBot.choose(game, botRng.current));
    commit(game);
    setSel(null);
  }, [game, commit]);

  useEffect(() => {
    if (!auto || game.status !== "playing") return;
    const t = setTimeout(botMove, 300);
    return () => clearTimeout(t);
  }, [auto, game, botMove]);

  const legalDigits = useMemo(() => {
    if (sel === null) return [];
    const out: number[] = [];
    for (let d = 1; d <= size_; d++) if (isLegal(game, sel, d)) out.push(d);
    return out;
  }, [sel, game, size_]);

  // per-cell tint: strong if the covering region is claimed/locked, faint
  // if it is merely the current territory leader
  const cellTint = useMemo(() => {
    const out: string[] = [];
    for (let cell = 0; cell < size_ * size_; cell++) {
      let claimMask = 0;
      let leadMask = 0;
      for (let k = 0; k < 3; k++) {
        const region = game.regions[game.cellRegions[cell * 3 + k]];
        if (region.claimedBy === 0) claimMask |= 1;
        else if (region.claimedBy === 1) claimMask |= 2;
        const h = territoryHolder(game, region);
        if (h === 0) leadMask |= 1;
        else if (h === 1) leadMask |= 2;
      }
      const m = claimMask || leadMask;
      const strong = claimMask !== 0;
      out.push(
        (m === 1 ? "t0" : m === 2 ? "t1" : m === 3 ? "t01" : "") +
          (strong && m ? " tstrong" : ""),
      );
    }
    return out;
  }, [game, size_]);

  const live = projectedScore(game);
  const lastCell =
    game.history.length > 0 ? game.history[game.history.length - 1].cell : -1;
  const claimedRegions = game.regions.filter((r) => r.claimedBy !== null);

  return (
    <div className="wrap">
      <h1>DENDOKU</h1>
      <p className="sub">
        A quiet contest over a shared grid. Place a digit where it does not
        repeat in its row, column, or box. When play freezes, each region goes
        to whoever holds the most cells in it — complete a region to lock it
        early.
      </p>

      <div className="layout">
        <div
          className="board"
          style={{ gridTemplateColumns: `repeat(${size_}, 44px)` }}
        >
          {Array.from({ length: size_ * size_ }, (_, cell) => {
            const r = Math.floor(cell / size_);
            const c = cell % size_;
            const v = game.grid[cell];
            const filled = v !== 0;
            const cls = [
              "cell",
              filled ? "filled" : "",
              game.seeded[cell] ? "seeded" : "",
              sel === cell ? "sel" : "",
              cellTint[cell],
              (c + 1) % box.cols === 0 && c < size_ - 1 ? "box-r" : "",
              (r + 1) % box.rows === 0 && r < size_ - 1 ? "box-b" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={cell}
                className={cls}
                disabled={filled || game.status !== "playing"}
                onClick={() => setSel(sel === cell ? null : cell)}
              >
                {filled ? v : ""}
                {cell === lastCell && <span className="just-placed" />}
              </button>
            );
          })}
        </div>

        <div className="side">
          <div className="panel">
            {game.status === "playing" ? (
              <div className="turn">
                <span className={`dot p${game.current}`} />
                <span>{game.current === 0 ? "Sage" : "Clay"} to move</span>
              </div>
            ) : (
              <div className="banner">
                {game.winner === "draw"
                  ? "A level game."
                  : `${game.winner === 0 ? "Sage" : "Clay"} takes the match.`}{" "}
                <span style={{ color: "var(--ink-soft)" }}>
                  (
                  {game.endReason === "no-legal-move"
                    ? "play froze"
                    : "grid complete"}
                  )
                </span>
              </div>
            )}

            <div className="scores">
              <div className="s">
                <span className="dot p0" /> Sage{" "}
                <b>{game.status === "playing" ? live[0] : game.score[0]}</b>
              </div>
              <div className="s">
                <span className="dot p1" /> Clay{" "}
                <b>{game.status === "playing" ? live[1] : game.score[1]}</b>
              </div>
              <div className="s" style={{ alignSelf: "center" }}>
                of {game.regions.length}
              </div>
            </div>
            {game.status === "playing" && (
              <div className="hint" style={{ marginTop: 4 }}>
                regions if play froze now · energy {game.energy[0]} / {game.energy[1]}
              </div>
            )}

            {sel !== null && game.status === "playing" && (
              <>
                <div className="hint">
                  cell r{Math.floor(sel / size_) + 1} c{(sel % size_) + 1} —
                  choose a digit:
                </div>
                <div className="picker">
                  {legalDigits.length === 0 && (
                    <span className="hint">no legal digit here</span>
                  )}
                  {legalDigits.map((d) => (
                    <button key={d} onClick={() => play(sel, d)}>
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="panel">
            <div className="controls">
              <button onClick={() => reset()}>New game</button>
              <label>
                grid
                <select
                  value={size}
                  onChange={(e) => {
                    const s = e.target.value as Size;
                    setSize(s);
                    reset(s);
                  }}
                >
                  <option value="9">9 × 9</option>
                  <option value="6">6 × 6</option>
                </select>
              </label>
              <label>
                seeds
                <select
                  value={seedCount}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setSeedCount(n);
                    reset(size, n);
                  }}
                >
                  {[0, 1, 3, 6, 10, 16].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                freeze
                <select
                  value={scoring}
                  onChange={(e) => {
                    const v = e.target.value as EndScoring;
                    setScoring(v);
                    reset(size, seedCount, v);
                  }}
                >
                  <option value="majority">majority</option>
                  <option value="keep">keep</option>
                  <option value="sweep">sweep (v1)</option>
                </select>
              </label>
            </div>
            <div className="controls" style={{ marginTop: 8 }}>
              <button onClick={botMove} disabled={game.status !== "playing"}>
                Bot move
              </button>
              <button
                onClick={() => setAuto((a) => !a)}
                disabled={game.status !== "playing"}
              >
                {auto ? "Stop auto-play" : "Auto-play (bots)"}
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="hint" style={{ marginTop: 0, marginBottom: 6 }}>
              Locked regions (completed in play)
            </div>
            <div className="log">
              {claimedRegions.length === 0 && <div>none yet</div>}
              {claimedRegions
                .slice()
                .sort((a, b) => (a.claimedOnTurn ?? 0) - (b.claimedOnTurn ?? 0))
                .map((rg) => (
                  <div key={rg.id}>
                    turn {rg.claimedOnTurn}: {regionLabel(rg)} →{" "}
                    {rg.claimedBy === 0 ? "Sage" : "Clay"}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
