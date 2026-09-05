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
      <g className="rig-arm rig-arm-l" style={{ transformOrigin: "34px 76px" }}>
        <path d="M34 76L26 98" stroke={WOOD_D} strokeWidth="7" strokeLinecap="round" />
        <g className="rig-forearm rig-forearm-l" style={{ transformOrigin: "26px 98px" }}>
          <path d="M26 98L20 118" stroke={WOOD_D} strokeWidth="6" strokeLinecap="round" />
          <circle cx="20" cy="120" r="6.5" fill={WOOD_D} stroke={INK} strokeWidth="2" />
        </g>
      </g>

      {/* the wooden bat body */}
      <path
        d="M42 26C40 12 52 4 60 4s20 8 18 22c-2 12 6 34 6 58 0 22-12 34-26 34S38 108 38 86c0-24 4-42 2-56Z"
        fill={WOOD}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M50 40q10 5 20 0M48 62q12 6 24 0" fill="none" stroke={WOOD_D} strokeWidth="2" opacity="0.55" />
      <path d="M40 76q20 10 40 0l-2 9q-18 8 -36 0z" fill="#7c3aed" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />

      {/* face */}
      <ellipse cx="49" cy="42" rx="10" ry="11" fill="#fff" stroke={INK} strokeWidth="2.2" />
      <ellipse cx="73" cy="40" rx="8.5" ry="9.5" fill="#fff" stroke={INK} strokeWidth="2.2" />
      <circle cx="52" cy="45" r="4" fill={INK} />
      <circle cx="75" cy="38" r="3.4" fill={INK} />
      <ellipse cx="60" cy="56" rx="5" ry="6.5" fill={INK} />
      <path d="M50 65q10 7 20 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />

      {/* right arm (holds the raygun) - in front of the body */}
      <g className="rig-arm rig-arm-r" style={{ transformOrigin: "86px 74px" }}>
        <path d="M86 74L96 94" stroke={WOOD_D} strokeWidth="7" strokeLinecap="round" />
        <g className="rig-forearm rig-forearm-r" style={{ transformOrigin: "96px 94px" }}>
          <path d="M96 94L104 112" stroke={WOOD_D} strokeWidth="6" strokeLinecap="round" />
          <circle cx="105" cy="114" r="6" fill={WOOD_D} stroke={INK} strokeWidth="2" />
          {/* the raygun */}
          <g transform="translate(105 114) rotate(-25)">
            <rect x="-4" y="-4" width="9" height="20" rx="3" fill="#2b2233" stroke={INK} strokeWidth="1.8" />
            <circle cx="0.5" cy="-6" r="4.4" fill="#7fffea" stroke={INK} strokeWidth="1.8" />
          </g>
        </g>
      </g>
    </svg>
  );
}
