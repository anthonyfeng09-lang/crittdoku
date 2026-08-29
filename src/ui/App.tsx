import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardConfig,
  CONFIG_6x6,
  CONFIG_9x9,
  GameState,
  applyMove,
  cloneState,
  createGame,
  generateSeeds,
  isLegal,
  regionLabel,
} from "../engine";
import { makeRng } from "../engine/rng";
import { greedyBot } from "../sim/bots";

type Size = "9" | "6";

function newGame(size: Size, seedCount: number): GameState {
  const config: BoardConfig = size === "9" ? CONFIG_9x9 : CONFIG_6x6;
  const rng = makeRng((Date.now() ^ (seedCount * 2654435761)) >>> 0);
  const seeds = generateSeeds(config, seedCount, rng);
  return createGame({ config, seeds, firstPlayer: 0 });
}

export function App() {
  const [size, setSize] = useState<Size>("9");
  const [seedCount, setSeedCount] = useState(6);
  const [game, setGame] = useState<GameState>(() => newGame("9", 6));
  const [sel, setSel] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const botRng = useRef(makeRng(12345));

  const size_ = game.config.size;
  const box = game.config.box;

  const reset = useCallback(
    (s: Size = size, sc: number = seedCount) => {
      setGame(newGame(s, sc));
      setSel(null);
      setAuto(false);
    },
    [size, seedCount],
  );

  const commit = useCallback((next: GameState) => {
    setGame(cloneState(next));
  }, []);

  const play = useCallback(
    (cell: number, digit: number) => {
      if (game.status !== "playing") return;
      if (!isLegal(game, cell, digit)) return;
      applyMove(game, { cell, digit });
      commit(game);
      setSel(null);
    },
    [game, commit],
  );

  const botMove = useCallback(() => {
    if (game.status !== "playing") return;
    const move = greedyBot.choose(game, botRng.current);
    applyMove(game, move);
    commit(game);
    setSel(null);
  }, [game, commit]);

  useEffect(() => {
    if (!auto || game.status !== "playing") return;
    const t = setTimeout(botMove, 350);
    return () => clearTimeout(t);
  }, [auto, game, botMove]);

  const legalDigits = useMemo(() => {
    if (sel === null) return [];
    const out: number[] = [];
    for (let d = 1; d <= size_; d++) if (isLegal(game, sel, d)) out.push(d);
    return out;
  }, [sel, game, size_]);

  const cellOwners = useMemo(() => {
    const owners: Array<0 | 1 | 2 | 3> = []; // bitmask: 1=p0, 2=p1
    for (let cell = 0; cell < size_ * size_; cell++) {
      let mask = 0;
      for (let k = 0; k < 3; k++) {
        const rid = game.cellRegions[cell * 3 + k];
        const o = game.regions[rid].claimedBy;
        if (o === 0) mask |= 1;
        else if (o === 1) mask |= 2;
      }
      owners.push(mask as 0 | 1 | 2 | 3);
    }
    return owners;
  }, [game, size_]);

  const lastCell =
    game.history.length > 0
      ? game.history[game.history.length - 1].cell
      : -1;

  const claimedRegions = game.regions.filter((r) => r.claimedBy !== null);

  return (
    <div className="wrap">
      <h1>DENDOKU</h1>
      <p className="sub">
        A quiet contest over a shared grid. Place a digit anywhere it does not
        repeat in its row, column, or box. Complete a region — a full row,
        column, or box — to claim it.
      </p>

      <div className="layout">
        <div
          className="board"
          style={{
            gridTemplateColumns: `repeat(${size_}, 44px)`,
          }}
        >
          {Array.from({ length: size_ * size_ }, (_, cell) => {
            const r = Math.floor(cell / size_);
            const c = cell % size_;
            const v = game.grid[cell];
            const filled = v !== 0;
            const owner = cellOwners[cell];
            const cls = [
              "cell",
              filled ? "filled" : "",
              game.seeded[cell] ? "seeded" : "",
              sel === cell ? "sel" : "",
              owner === 1 ? "claim0" : owner === 2 ? "claim1" : owner === 3 ? "claim01" : "",
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
                <span>
                  {game.current === 0 ? "Sage" : "Clay"} to move
                </span>
              </div>
            ) : (
              <div className="banner">
                {game.winner === "draw"
                  ? "A level game."
                  : `${game.winner === 0 ? "Sage" : "Clay"} takes the match.`}{" "}
                <span style={{ color: "var(--ink-soft)" }}>
                  (
                  {game.endReason === "no-legal-move"
                    ? "no legal move remained"
                    : "grid complete"}
                  )
                </span>
              </div>
            )}

            <div className="scores">
              <div className="s">
                Sage regions <b>{game.score[0]}</b>
              </div>
              <div className="s">
                Clay regions <b>{game.score[1]}</b>
              </div>
            </div>
            <div className="scores">
              <div className="s">
                Sage energy <b>{game.energy[0]}</b>
              </div>
              <div className="s">
                Clay energy <b>{game.energy[1]}</b>
              </div>
            </div>

            {sel !== null && game.status === "playing" && (
              <>
                <div className="hint">
                  Cell r{Math.floor(sel / size_) + 1} c{(sel % size_) + 1} —
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
              Claimed regions
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
