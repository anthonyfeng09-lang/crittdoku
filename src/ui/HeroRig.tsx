/* A small articulated tung, used only for the Tungify "on" cinematic's
 * cold open. Built from the same wooden-bat silhouette as the roster's Tung
 * sprites (so it actually reads as a tung tung tung sahur), but with real
 * shoulder/elbow joints as nested <g>s so CSS keyframes can raise and fire
 * its raygun arm while the whole rig also flies through 3D as a rigid
 * billboard - see the rig-idle and rig-aim keyframes in styles.css. */

const WOOD = "#a9743f";
const WOOD_D = "#7c4f28";
const INK = "#241b2e";

export function HeroRig({ size = 150 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 -8 120 138"
      style={{ overflow: "visible", display: "block" }}
      aria-hidden="true"
    >
      {/* left arm (steadying the rail) - behind the body */}
      <g className="rig-arm rig-arm-l" style={{ transformOrigin: "40px 60px" }}>
        <path d="M40 60L30 82" stroke={WOOD_D} strokeWidth="7" strokeLinecap="round" />
        <g className="rig-forearm rig-forearm-l" style={{ transformOrigin: "30px 82px" }}>
          <path d="M30 82L23 102" stroke={WOOD_D} strokeWidth="6" strokeLinecap="round" />
          <circle cx="22" cy="104" r="6.5" fill={WOOD_D} stroke={INK} strokeWidth="2" />
        </g>
      </g>

      {/* the wooden bat body - a narrow straight-sided capsule, the same
          silhouette as the roster's "tall" tung, so it actually reads as
          tung tung tung sahur rather than a generic round mascot */}
      <path
        d="M44 18a16 16 0 0 1 32 0L76 112a16 16 0 0 1 -32 0Z"
        fill={WOOD}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M50 30q10 5 20 0M48 84q12 6 24 0" fill="none" stroke={WOOD_D} strokeWidth="2" opacity="0.55" />
      <path d="M44 58q16 9 32 0l-2 9q-14 8 -28 0z" fill="#7c3aed" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />

      {/* face, sitting near the top of the bat */}
      <ellipse cx="50" cy="30" rx="9" ry="10" fill="#fff" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="71" cy="28" rx="7.5" ry="8.5" fill="#fff" stroke={INK} strokeWidth="2.2" />
      <circle cx="52" cy="33" r="3.6" fill={INK} />
      <circle cx="73" cy="26" r="3" fill={INK} />
      <ellipse cx="60" cy="42" rx="4.5" ry="6" fill={INK} />
      <path d="M52 50q8 6 16 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />

      {/* right arm (holds the raygun) - in front of the body */}
      <g className="rig-arm rig-arm-r" style={{ transformOrigin: "80px 58px" }}>
        <path d="M80 58L90 78" stroke={WOOD_D} strokeWidth="7" strokeLinecap="round" />
        <g className="rig-forearm rig-forearm-r" style={{ transformOrigin: "90px 78px" }}>
          <path d="M90 78L98 96" stroke={WOOD_D} strokeWidth="6" strokeLinecap="round" />
          <circle cx="99" cy="98" r="6" fill={WOOD_D} stroke={INK} strokeWidth="2" />
          {/* the raygun */}
          <g transform="translate(99 98) rotate(-25)">
            <rect x="-4" y="-4" width="9" height="20" rx="3" fill="#2b2233" stroke={INK} strokeWidth="1.8" />
            <circle cx="0.5" cy="-6" r="4.4" fill="#7fffea" stroke={INK} strokeWidth="1.8" />
          </g>
        </g>
      </g>
    </svg>
  );
}
