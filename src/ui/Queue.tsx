import { useEffect, useRef, useState } from "react";
import { joinQueue, type Net } from "../net/peer";

/* "Finding an opponent" for the ranked / casual queues. Tries a public
 * rendezvous for a random 20-30s; if nobody's around it hands back so App can
 * start a bot match instead. Ranked entry gets a trophy-storm intro. */

export function Queue({
  kind,
  playerName,
  onMatch,
  onBot,
  onHome,
}: {
  kind: "ranked" | "casual";
  playerName: string;
  onMatch: (net: Net, isHost: boolean) => void;
  onBot: () => void;
  onHome: () => void;
}) {
  const ranked = kind === "ranked";
  const [phase, setPhase] = useState<"intro" | "search">(
    ranked ? "intro" : "search",
  );
  const [dots, setDots] = useState(0);
  const cancelRef = useRef<() => void>(() => {});
  const trophies = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      x: Math.random() * 100,
      d: Math.random() * 0.5,
      dur: 0.7 + Math.random() * 0.5,
      rot: (Math.random() - 0.5) * 90,
      big: i % 4 === 0,
    })),
  );

  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("search"), 1500);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "search") return;
    const timeoutMs = 20000 + Math.floor(Math.random() * 10000); // 20-30s
    const q = joinQueue(kind, playerName, onMatch, onBot, timeoutMs);
    cancelRef.current = q.cancel;
    const iv = setInterval(() => setDots((d) => (d + 1) % 4), 450);
    return () => {
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className={`app queue-app ${phase === "intro" ? "quake" : ""}`}>
      {ranked && phase === "intro" && (
        <div className="trophy-rain" aria-hidden="true">
          {trophies.current.map((tr, i) => (
            <span
              key={i}
              style={{
                left: `${tr.x}%`,
                animationDelay: `${tr.d}s`,
                animationDuration: `${tr.dur}s`,
                fontSize: tr.big ? "42px" : "26px",
                ["--rot" as string]: `${tr.rot}deg`,
              }}
            >
              🏆
            </span>
          ))}
        </div>
      )}

      <div className="appbar">
        <h1>CRITTDOKU</h1>
        <span className="status">
          {ranked ? "ranked queue" : "quick match"}
        </span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button
            onClick={() => {
              cancelRef.current();
              onHome();
            }}
          >
            Menu
          </button>
        </div>
      </div>

      <main className="stage online">
        <div className="online-card">
          {phase === "intro" ? (
            <>
              <div className="q-trophy">🏆</div>
              <h2>Entering the ranked queue</h2>
            </>
          ) : (
            <>
              <h2>Finding an opponent{".".repeat(dots)}</h2>
              <p className="sub">
                Matching you with another player. If nobody's around in a bit
                you'll face a {ranked ? "Fierce" : "Sharp"} trainer instead
                {ranked ? " (still ranked)" : ""}.
              </p>
              <div className="pulse-dot" />
              <button
                className="big-btn ghost"
                style={{ marginTop: 16 }}
                onClick={() => {
                  cancelRef.current();
                  onBot();
                }}
              >
                Face a bot now
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
