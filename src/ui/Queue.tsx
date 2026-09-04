import { useEffect, useRef, useState, type CSSProperties } from "react";
import { joinQueue, type Net } from "../net/peer";
import { ALL_CREATURES, type CreatureId } from "../engine";
import { Critter } from "./Critter";

/* "Finding an opponent" for the ranked / casual queues. Tries a public
 * rendezvous for a random 20-30s; if nobody's around it hands back so App can
 * start a bot match instead. Entering a queue drops a full-screen curtain that
 * pours straight down and off the bottom - trophies and rank badges for
 * ranked, a stampede of critters for casual - then the queue card bounces in
 * on the cleared screen. */

const INK = "#2b2233";

function Trophy() {
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em">
      <path d="M16 10h32v10c0 12-7 20-16 20S16 32 16 20V10Z" fill="#ffd23f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M16 14c-8 0-11 4-11 9s4 9 12 9" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M48 14c8 0 11 4 11 9s-4 9-12 9" fill="none" stroke={INK} strokeWidth="3" />
      <rect x="27" y="39" width="10" height="9" fill="#f2a900" stroke={INK} strokeWidth="3" />
      <path d="M18 56c0-5 5-8 14-8s14 3 14 8Z" fill="#f2a900" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 16l3 6 6 .6-4.5 4 1.3 6-5.8-3.2-5.8 3.2 1.3-6L20.5 22.6 26.5 22Z" fill="#fff5c2" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function Star() {
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em">
      <path d="M32 5l8 17 19 2-14 13 4 19-17-9-17 9 4-19L5 24l19-2Z" fill="#ffcf3f" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}
function Medal() {
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em">
      <path d="M20 4l10 22h-10L12 8Z" fill="#f43f5e" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 4L34 26h10l8-18Z" fill="#06b6d4" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="42" r="18" fill="#ffd23f" stroke={INK} strokeWidth="3.5" />
      <circle cx="32" cy="42" r="10" fill="#f2a900" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}
function Badge() {
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em">
      <path d="M32 4l24 8v16c0 18-12 28-24 32C20 56 8 46 8 28V12Z" fill="#a855f7" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M32 16l5 10 11 1-8 8 2 11-10-6-10 6 2-11-8-8 11-1Z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
function Gem() {
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em">
      <path d="M16 8h32l12 16-28 32L4 24Z" fill="#22d3ee" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M4 24h56M16 8l16 16 16-16M32 24v32" fill="none" stroke={INK} strokeWidth="2.5" />
      <path d="M16 8l4 16-8 0Z" fill="#a5f3fc" stroke="none" />
    </svg>
  );
}
function Crown() {
  return (
    <svg viewBox="0 0 64 64" width="1em" height="1em">
      <path d="M8 20l10 10 14-18 14 18 10-10-4 32H12Z" fill="#ffd23f" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="8" cy="18" r="4" fill="#f43f5e" stroke={INK} strokeWidth="2.5" />
      <circle cx="56" cy="18" r="4" fill="#f43f5e" stroke={INK} strokeWidth="2.5" />
      <circle cx="32" cy="10" r="4" fill="#06b6d4" stroke={INK} strokeWidth="2.5" />
      <rect x="12" y="52" width="40" height="7" rx="2" fill="#f2a900" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

const ICONS = [Trophy, Star, Medal, Badge, Gem, Crown];

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
  const [showShower, setShowShower] = useState(true);
  const [keepStorm, setKeepStorm] = useState(true);
  const [rumble, setRumble] = useState(true);
  const [showCard, setShowCard] = useState(false);
  const [dots, setDots] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const cancelRef = useRef<() => void>(() => {});

  // A wall stacked in a tall band entirely above the viewport, then poured
  // straight down through the screen and off the bottom. The band is ~1.8
  // screens tall so it blankets the viewport the whole way down. The fall is
  // held a beat after mount so the nodes paint before they animate (no
  // first-frame stutter). Ranked rains prize icons; casual rains critters,
  // which are heavier to draw so there are fewer, larger ones.
  // Held one frame after mount so the nodes paint before they animate, then
  // the whole band (which sits ENTIRELY above the viewport - nothing shows
  // during the hold) pours straight down through the screen and off the
  // bottom. Ranked rains prize icons; casual rains critters, which are
  // heavier to draw so there are fewer, larger ones.
  const HOLD = 0.08;
  const COLS = ranked ? 20 : 10;
  const COUNT = ranked ? 900 : 200;
  const shower = useRef(
    Array.from({ length: COUNT }, (_, i) => {
      const col = i % COLS;
      return {
        Icon: ICONS[i % ICONS.length],
        cid: ALL_CREATURES[
          Math.floor(Math.random() * ALL_CREATURES.length)
        ] as CreatureId,
        x: (col / COLS) * 100 + Math.random() * (ranked ? 7 : 13),
        size: ranked ? 46 + Math.random() * 54 : 90 + Math.random() * 84,
        // top edge starts at y0vh; -35vh is clear of the viewport even for
        // the tallest node, so the hold shows an empty screen, not a frozen
        // wall of things sitting at the top
        y0: -230 + Math.random() * 195,
        delay: HOLD + Math.random() * 0.1,
        dur: 1.45 + Math.random() * 0.3,
        spin: (Math.random() - 0.5) * (ranked ? 620 : 240),
      };
    }),
  );

  // one-shot: never re-run, so nothing clears the card timer early. The storm
  // is hidden with `hidden` (cheap) rather than unmounted mid-frame - tearing
  // down hundreds of nodes right as the card mounts is its own little hitch.
  useEffect(() => {
    const r = setTimeout(() => setRumble(false), 1350);
    const a = setTimeout(() => {
      setShowShower(false); // .spent -> display:none (cheap)
      setShowCard(true); // card drops in exactly as the curtain leaves
    }, 1500);
    const c = setTimeout(() => setKeepStorm(false), 3200); // now free the nodes
    return () => {
      clearTimeout(r);
      clearTimeout(a);
      clearTimeout(c);
    };
  }, []);

  useEffect(() => {
    const timeoutMs = 20000 + Math.floor(Math.random() * 10000); // 20-30s
    const q = joinQueue(kind, playerName, onMatch, onBot, timeoutMs);
    cancelRef.current = q.cancel;
    const start = Date.now();
    const iv = setInterval(() => {
      setDots((d) => (d + 1) % 4);
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 450);
    return () => {
      clearInterval(iv);
      q.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="app queue-app">
      {keepStorm && (
        <div
          className={`prize-storm${rumble ? " rumble" : ""}${
            ranked ? "" : " critters"
          }${showShower ? "" : " spent"}`}
          aria-hidden="true"
        >
          {shower.current.map((p, i) => {
            const P = p.Icon;
            return (
              <span
                key={i}
                className="prize"
                style={
                  {
                    left: `${p.x}%`,
                    top: `${p.y0}vh`,
                    fontSize: `${p.size}px`,
                    "--spin": `${p.spin}deg`,
                    "--d": `${p.delay}s`,
                    "--fd": `${p.dur}s`,
                  } as CSSProperties
                }
              >
                {ranked ? <P /> : <Critter id={p.cid} size={p.size} />}
              </span>
            );
          })}
        </div>
      )}

      <div className="appbar">
        <h1>CRITTDOKU</h1>
        <span className="status">{ranked ? "Ranked queue" : "Quick match"}</span>
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
        {showCard && (
          <div className="online-card q-card-bounce">
            <h2>Finding an opponent{".".repeat(dots)}</h2>
            <div className="q-timer">{mmss}</div>
            <p className="sub">
              {ranked
                ? "Matching you with a ranked player near your skill."
                : "Matching you with an opponent for a casual game."}
            </p>
            <div className="pulse-dot" />
            <button
              className="big-btn ghost"
              style={{ marginTop: 16 }}
              onClick={() => {
                cancelRef.current();
                onHome();
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
