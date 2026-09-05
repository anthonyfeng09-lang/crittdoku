/* A small articulated rig used only for the Tungify "on" cinematic's dive.
 * Unlike the roster's Tung sprites (one flat pose each), this one has real
 * shoulder/elbow joints as nested <g>s so CSS keyframes can swing the arms
 * independently while the whole rig also tumbles in 3D as a rigid billboard
 * - see the rig-arm and rig-forearm keyframes in styles.css. */

const WOOD = "#a9743f";
const WOOD_D = "#7c4f28";
const INK = "#241b2e";

export function HeroRig({ size = 150 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.35}
      viewBox="0 0 120 162"
      style={{ overflow: "visible", display: "block" }}
      aria-hidden="true"
    >
      {/* legs */}
      <path d="M46 132l-8 20M74 132l8 20" stroke={WOOD_D} strokeWidth="9" strokeLinecap="round" />
      <ellipse cx="34" cy="154" rx="10" ry="5" fill={WOOD_D} />
      <ellipse cx="86" cy="154" rx="10" ry="5" fill={WOOD_D} />

      {/* right arm - behind the torso */}
      <g className="rig-arm rig-arm-r" style={{ transformOrigin: "80px 58px" }}>
        <rect x="74" y="58" width="15" height="34" rx="7" fill={WOOD} stroke={INK} strokeWidth="2.4" />
        <g className="rig-forearm rig-forearm-r" style={{ transformOrigin: "82px 90px" }}>
          <rect x="76" y="90" width="14" height="30" rx="7" fill={WOOD} stroke={INK} strokeWidth="2.4" />
          <circle cx="83" cy="122" r="9" fill={WOOD_D} stroke={INK} strokeWidth="2.2" />
        </g>
      </g>

      {/* torso */}
      <rect x="36" y="46" width="48" height="66" rx="20" fill={WOOD} stroke={INK} strokeWidth="3" />
      <path d="M40 60q20 8 40 0" fill="none" stroke={WOOD_D} strokeWidth="2" opacity="0.6" />
      <path d="M38 80q22 10 44 0l-2 10q-20 8 -40 0z" fill="#7c3aed" stroke={INK} strokeWidth="2.4" />

      {/* left arm - in front of the torso */}
      <g className="rig-arm rig-arm-l" style={{ transformOrigin: "40px 58px" }}>
        <rect x="31" y="58" width="15" height="34" rx="7" fill={WOOD} stroke={INK} strokeWidth="2.4" />
        <g className="rig-forearm rig-forearm-l" style={{ transformOrigin: "38px 90px" }}>
          <rect x="30" y="90" width="14" height="30" rx="7" fill={WOOD} stroke={INK} strokeWidth="2.4" />
          <circle cx="37" cy="122" r="9" fill={WOOD_D} stroke={INK} strokeWidth="2.2" />
        </g>
      </g>

      {/* head */}
      <circle cx="60" cy="28" r="22" fill={WOOD} stroke={INK} strokeWidth="3" />
      <ellipse cx="49" cy="24" rx="8" ry="9" fill="#fff" stroke={INK} strokeWidth="2" />
      <ellipse cx="71" cy="24" rx="8" ry="9" fill="#fff" stroke={INK} strokeWidth="2" />
      <circle cx="50" cy="26" r="3.6" fill={INK} />
      <circle cx="72" cy="22" r="3" fill={INK} />
      <ellipse cx="60" cy="36" rx="5" ry="6" fill={INK} />
      <path d="M50 44q10 8 20 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
