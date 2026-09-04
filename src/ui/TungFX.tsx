import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ALL_CREATURES } from "../engine";
import { Critter } from "./Critter";
import { Tung } from "./TungCritter";
import { TungContext } from "./tungContext";

/* The toggle spectacle.
 *
 *  "on"  - a ~48s cinematic in five acts: a rift opens and tungs drop out of
 *          it (Invasion); a champion tung hops platform to platform across
 *          the sky and lands a flying punch on a fleeing critter (the
 *          Ultimate, styled after a fighting-game finisher); the old world's
 *          name cracks apart (transition); a ring of critters spin and
 *          morph into tungs one by one (Conversion); TUNG3DOKU slams in
 *          (Victory). A Skip button is up the whole time. Pure CSS
 *          timelines (animation-delay per element) so it stays smooth; one
 *          timeout fires onDone, or Skip fires it early.
 *  "off" - a ~3s brush stroke paints CRITTDOKU back over TUNGDOKU, then a
 *          wipe clears to the normal skin.
 *
 * The ring/drops/victim pull from ALL_CREATURES, so more critters just means
 * more variety - nothing here needs touching. */

const RING_N = 12;
const DROP_N = 6;
const ON_TOTAL = 48500;
// act boundaries, ms: invasion / the ultimate / transition+banners / conversion / victory
const MARKS = [0, 10000, 30000, 37000, 44000];
const CAPTIONS = [
  "Somewhere, the tungs stirred — and fell from the sky.",
  "One rose above the rest, and struck like nothing they'd seen.",
  "The critters' world lay open.",
  "One by one, everything changed.",
  "",
];

const PLATFORMS = [
  { x: 10, y: 16, w: 116 },
  { x: 28, y: 34, w: 102 },
  { x: 50, y: 50, w: 102 },
  { x: 72, y: 36, w: 102 },
  { x: 90, y: 20, w: 116 },
];

export function TungFX({
  mode,
  onDone,
}: {
  mode: "on" | "off";
  onDone: () => void;
}) {
  const [phase, setPhase] = useState(0);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  const ring = useMemo(() => {
    const pool = ALL_CREATURES.slice();
    const out: string[] = [];
    for (let i = 0; i < RING_N; i++) out.push(pool[(i * 7) % pool.length]);
    return out;
  }, []);

  useEffect(() => {
    const total = mode === "on" ? ON_TOTAL : 3000;
    const marks = mode === "on" ? MARKS : [0, 1600, 2600];
    let fired = false;
    const timers = marks.map((m, i) => setTimeout(() => setPhase(i), m));
    const end = setTimeout(() => {
      if (fired) return;
      fired = true;
      doneCb.current();
    }, total);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [mode]);

  const skip = () => doneCb.current();

  if (mode === "off") {
    return (
      <div className="tungfx tungfx-off">
        <div className="tfx-brush-band">
          <span className="tfx-old">TUNGDOKU</span>
          <span className="tfx-new">CRITTDOKU</span>
          <span className="tfx-stroke" />
        </div>
        {phase >= 2 && <div className="tfx-wipe" />}
        <div className="tfx-drips" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={{ left: `${12 + i * 15}%`, animationDelay: `${0.3 + i * 0.12}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tungfx tungfx-on">
      <button className="tfx2-skip" onClick={skip} type="button">
        Skip &raquo;
      </button>

      {/* a dark backdrop for the whole cinematic */}
      <div className="tfx-void" />

      {/* ============ ACT I: INVASION - a rift opens, tungs drop ============
          ACT II: THE ULTIMATE - platforms rise, the champion hops and hits
          ACT III: the world settles, banners rise, ready for what's next */}
      <div className="tfx2-arena">
        <div className="tfx2-portal" />

        {Array.from({ length: DROP_N }, (_, i) => {
          const fallDelay = 1.4 + i * 0.55;
          return (
            <div
              key={i}
              className="tfx2-drop"
              style={{ left: `${9 + i * 16}%`, animationDelay: `${fallDelay}s` }}
            >
              <Tung id={ring[i % ring.length] as never} size={50} />
              <span className="tfx2-land" style={{ animationDelay: `${fallDelay + 1.3}s` }} />
            </div>
          );
        })}

        {PLATFORMS.map((p, i) => (
          <div
            key={i}
            className="tfx2-plat"
            style={
              {
                left: `${p.x}%`,
                bottom: `${p.y}%`,
                width: p.w,
                animationDelay: `${10 + i * 0.14}s`,
              } as CSSProperties
            }
          />
        ))}

        <div className="tfx2-victim">
          <TungContext.Provider value={false}>
            <Critter id={ring[3] as never} size={70} noTung />
          </TungContext.Provider>
        </div>

        <div className="tfx2-hero">
          <Tung id={ring[0] as never} size={92} />
        </div>

        <div className="tfx2-punch-flash" />
        <div className="tfx2-punch-shock" />
        <div className="tfx2-punch-shock tfx2-punch-shock-b" />

        <div className="tfx2-banner tfx2-banner-l" />
        <div className="tfx2-banner tfx2-banner-r" />
      </div>

      {/* ============ transition: the old name cracks apart ============ */}
      <div className="tfx-flash" style={{ animationDelay: "36.75s" }} />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="tfx-shock" style={{ animationDelay: `${36.8 + i * 0.14}s` }} />
      ))}
      <div className="tfx-speed" style={{ animationDelay: "36.8s" }} aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ "--a": `${(360 / 18) * i}deg` } as CSSProperties} />
        ))}
      </div>
      <div className="tfx-shatter" style={{ animationDelay: "35.5s" }}>
        CRITTDOKU
      </div>

      {/* ============ ACT IV: CONVERSION - a ring of critters morph ============ */}
      <div className="tfx-vortex">
        <div className="tfx-ring">
          {ring.map((id, i) => (
            <div
              key={i}
              className="tfx-orb"
              style={
                {
                  "--i": i,
                  "--n": RING_N,
                  animationDelay: `${37.6 + i * 0.42}s`,
                } as CSSProperties
              }
            >
              <span className="tfx2-bowl" />
              <div className="tfx-orb-crit">
                <TungContext.Provider value={false}>
                  <Critter id={id as never} size={64} noTung />
                </TungContext.Provider>
              </div>
              <div className="tfx-orb-tung">
                <Tung id={id as never} size={68} />
              </div>
              <span className="tfx-orb-pop" />
            </div>
          ))}
        </div>
      </div>

      {/* ============ ACT V: VICTORY - the reveal ============ */}
      <div className="tfx-pop" />
      <div className="tfx-wordmark">
        TUNG<sup>3</sup>DOKU
      </div>
      <div className="tfx-confetti" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span
            key={i}
            style={
              {
                left: `${5 + Math.random() * 90}%`,
                "--r": `${(Math.random() - 0.5) * 720}deg`,
                animationDelay: `${44.4 + Math.random() * 0.8}s`,
              } as CSSProperties
            }
          >
            <Tung id={ring[i % ring.length] as never} size={22} />
          </span>
        ))}
      </div>

      {phase < 4 && CAPTIONS[phase] && (
        <div key={phase} className="tfx2-caption">
          {CAPTIONS[phase]}
        </div>
      )}
    </div>
  );
}
