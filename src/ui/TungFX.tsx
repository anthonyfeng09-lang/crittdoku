import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ALL_CREATURES } from "../engine";
import { Critter } from "./Critter";
import { Tung } from "./TungCritter";
import { TungContext } from "./tungContext";

/* The toggle spectacle.
 *
 *  "on"  - a ~15s power-up: charge, freeze-frame, white-flash impact, a
 *          spinning vortex where a ring of critters morph one by one into
 *          tungs, then TUNG3DOKU slams in. Styled after a fighting-game
 *          ultimate. Pure CSS timelines (animation-delay per element) so it
 *          stays smooth; one timeout fires onDone.
 *  "off" - a ~3s brush stroke paints CRITTDOKU back over TUNGDOKU, then a
 *          wipe clears to the normal skin.
 *
 * The ring pulls from ALL_CREATURES, so more critters just means a fuller
 * ring - nothing here needs touching. */

const RING_N = 12;

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
    const total = mode === "on" ? 15000 : 3000;
    const marks =
      mode === "on" ? [0, 2500, 5000, 7000, 12200, 14400] : [0, 1600, 2600];
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
    <div className={`tungfx tungfx-on tfx-p${phase}`}>
      {/* charge: converging energy lines + core */}
      <div className="tfx-void" />
      <div className="tfx-lines" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} style={{ "--a": `${(360 / 24) * i}deg` } as CSSProperties} />
        ))}
      </div>
      <div className="tfx-core" />
      <div className="tfx-rumble" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.09}s` }} />
        ))}
      </div>
      <div className="tfx-kanji tfx-k1">TUNG</div>
      <div className="tfx-kanji tfx-k2">TUNG</div>
      <div className="tfx-kanji tfx-k3">SAHUR</div>

      {/* impact */}
      <div className="tfx-flash" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="tfx-shock" style={{ animationDelay: `${5 + i * 0.14}s` }} />
      ))}
      <div className="tfx-speed" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ "--a": `${(360 / 18) * i}deg` } as CSSProperties} />
        ))}
      </div>
      <div className="tfx-shatter">CRITTDOKU</div>

      {/* the spin: a ring of critters that morph to tungs */}
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
                  animationDelay: `${7.2 + i * 0.28}s`,
                } as CSSProperties
              }
            >
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

      {/* reveal */}
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
                animationDelay: `${12.4 + Math.random() * 0.7}s`,
              } as CSSProperties
            }
          >
            <Tung id={ring[i % ring.length] as never} size={22} />
          </span>
        ))}
      </div>
    </div>
  );
}
