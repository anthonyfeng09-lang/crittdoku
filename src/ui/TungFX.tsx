import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ALL_CREATURES } from "../engine";
import { Critter } from "./Critter";
import { Tung } from "./TungCritter";
import { HeroRig } from "./HeroRig";
import { TungContext } from "./tungContext";

/* The toggle spectacle.
 *
 *  "on"  - a tight ~16s cinematic, all the weight on one shot: a champion
 *          tumbles out of the sky in true CSS 3D (perspective + preserve-3d,
 *          the "camera" itself swooping in rotateY/rotateX around the fall)
 *          with its arms swinging on real shoulder/elbow joints the whole
 *          way down (see HeroRig + the .rig-* keyframes), trailed by a
 *          comet streak. The landing is sold with a genuine hit-stop (every
 *          animation on the page pauses for a beat, fighting-game style),
 *          an afterimage-style flash, a manga-panel impact card and a
 *          chromatic-split flash. Then the old world's name cracks apart,
 *          a ring of critters spin and morph into tungs one by one, and
 *          TUNG3DOKU slams in. A Skip button is up the whole time. Pure CSS
 *          timelines (animation-delay per element) plus one Web Animations
 *          pause/resume for the hit-stop; one timeout fires onDone, or Skip
 *          fires it early.
 *  "off" - a ~3s brush stroke paints CRITTDOKU back over TUNGDOKU, then a
 *          wipe clears to the normal skin.
 *
 * The ring pulls from ALL_CREATURES, so more critters just means a fuller
 * conversion ring - nothing here needs touching. */

const RING_N = 12;
const ON_TOTAL = 15650;
const HIT_STOP_AT = 4500; // ms - the instant the fist connects
const HIT_STOP_MS = 180; // how long the whole timeline freezes for
// phase boundaries, ms: the dive / the crack / the conversion / the reveal
const MARKS = [0, 5000, 7200, 11200];
const CAPTIONS = ["", "", "One by one, everything changed.", ""];

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

  // the hit-stop: freeze every running animation on the punch frame, hold
  // it a beat, then let go - the whole screen flinches with the impact
  // instead of just one sprite reacting to it
  useEffect(() => {
    if (mode !== "on") return;
    let held: Animation[] = [];
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const pauseTimer = setTimeout(() => {
      held = document.getAnimations().filter((a) => a.playState === "running");
      held.forEach((a) => a.pause());
      resumeTimer = setTimeout(() => {
        held.forEach((a) => {
          try {
            a.play();
          } catch {
            /* animation may have been cleaned up already */
          }
        });
        held = [];
      }, HIT_STOP_MS);
    }, HIT_STOP_AT);
    return () => {
      clearTimeout(pauseTimer);
      if (resumeTimer) clearTimeout(resumeTimer);
      held.forEach((a) => {
        try {
          a.play();
        } catch {
          /* ignore */
        }
      });
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

      {/* ============ THE DIVE: true 3D, camera swooping, joints moving ============ */}
      <div className="tfx3-perspective">
        <div className="tfx3-scene">
          <div className="tfx3-depth" aria-hidden="true">
            {Array.from({ length: 26 }, (_, i) => {
              const depths = [-500, -380, -260, -140];
              return (
                <span
                  key={i}
                  className="tfx3-star"
                  style={
                    {
                      left: `${(i * 37) % 100}%`,
                      top: `${(i * 53) % 100}%`,
                      transform: `translateZ(${depths[i % depths.length]}px)`,
                    } as CSSProperties
                  }
                />
              );
            })}
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className="tfx3-streak"
                style={
                  {
                    left: `${6 + i * 9.5}%`,
                    height: `${18 + (i % 3) * 6}vh`,
                    transform: `translateZ(${-460 + (i % 4) * 80}px)`,
                    animationDelay: `${(i * 0.31) % 1.6}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="tfx3-hero">
            <div className="tfx3-trail" />
            <HeroRig size={130} />
          </div>
        </div>
      </div>

      <div className="tfx2-impact-lines" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} style={{ "--a": `${(360 / 16) * i}deg` } as CSSProperties} />
        ))}
      </div>
      <div className="tfx2-punch-flash" />
      <div className="tfx2-chroma tfx2-chroma-r" />
      <div className="tfx2-chroma tfx2-chroma-c" />
      <div className="tfx2-punch-shock" />
      <div className="tfx2-punch-shock tfx2-punch-shock-b" />
      <div className="tfx2-impact-card">
        <span>SMASH</span>
      </div>

      {/* ============ transition: the old name cracks apart ============ */}
      <div className="tfx-flash" style={{ animationDelay: "7.05s" }} />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="tfx-shock" style={{ animationDelay: `${7.1 + i * 0.14}s` }} />
      ))}
      <div className="tfx-speed" style={{ animationDelay: "7.1s" }} aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ "--a": `${(360 / 18) * i}deg` } as CSSProperties} />
        ))}
      </div>
      <div className="tfx-shatter" style={{ animationDelay: "5.9s" }}>
        CRITTDOKU
      </div>

      {/* ============ CONVERSION - a ring of critters morph ============ */}
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
                  animationDelay: `${7.5 + i * 0.27}s`,
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

      {/* ============ VICTORY - the reveal ============ */}
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
                animationDelay: `${11.4 + Math.random() * 0.8}s`,
              } as CSSProperties
            }
          >
            <Tung id={ring[i % ring.length] as never} size={22} />
          </span>
        ))}
      </div>

      {phase < 3 && CAPTIONS[phase] && (
        <div key={phase} className="tfx2-caption">
          {CAPTIONS[phase]}
        </div>
      )}
    </div>
  );
}
