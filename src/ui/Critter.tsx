import { CATEGORIES, ROSTER, CreatureId } from "../engine";

type Body = "round" | "egg" | "pebble" | "spiky" | "leaf";
type Feature = "none" | "ears" | "antenna" | "sprout" | "shell" | "wings" | "horn" | "tuft";

interface Spec {
  body: Body;
  feature: Feature;
  /** override the category colour */
  fill?: string;
  accent: string;
}

const SPEC: Record<CreatureId, Spec> = {
  boulderpup: { body: "pebble", feature: "ears", accent: "#3c7a4a" },
  mossback: { body: "pebble", feature: "sprout", accent: "#2f6b3c" },
  slumberstone: { body: "round", feature: "tuft", accent: "#4c8c5b" },

  breezefinch: { body: "egg", feature: "wings", accent: "#2b8a8a" },
  tumbleweed: { body: "spiky", feature: "none", accent: "#2b8a8a" },
  glidewing: { body: "leaf", feature: "wings", accent: "#2b8a8a" },

  snoozemouse: { body: "round", feature: "ears", accent: "#6f5fc0" },
  fogkit: { body: "egg", feature: "tuft", accent: "#6f5fc0" },
  dozderling: { body: "round", feature: "antenna", accent: "#6f5fc0" },

  nutsquirrel: { body: "egg", feature: "tuft", accent: "#c58f28" },
  acorncache: { body: "pebble", feature: "sprout", accent: "#c58f28" },
  sunbeetle: { body: "round", feature: "horn", accent: "#c58f28" },

  pricklehog: { body: "spiky", feature: "none", accent: "#c96a5f" },
  shellclam: { body: "pebble", feature: "shell", accent: "#c96a5f" },
  barknewt: { body: "leaf", feature: "sprout", accent: "#c96a5f" },

  swiftwren: { body: "egg", feature: "wings", accent: "#c9743f" },
  digmole: { body: "round", feature: "horn", accent: "#c9743f" },
  wildlark: { body: "leaf", feature: "antenna", accent: "#c9743f" },
};

function bodyPath(body: Body): JSX.Element {
  switch (body) {
    case "egg":
      return <ellipse cx="32" cy="36" rx="17" ry="21" />;
    case "pebble":
      return <ellipse cx="32" cy="38" rx="22" ry="17" />;
    case "leaf":
      return <path d="M32 12 C48 20 46 52 32 58 C18 52 16 20 32 12 Z" />;
    case "spiky":
      return (
        <path d="M32 11 l5 6 6 -3 -1 7 7 2 -5 5 5 5 -7 2 1 7 -6 -3 -5 6 -5 -6 -6 3 1 -7 -7 -2 5 -5 -5 -5 7 -2 -1 -7 6 3 Z" />
      );
    default:
      return <circle cx="32" cy="34" r="20" />;
  }
}

function featureEls(feature: Feature, accent: string): JSX.Element | null {
  switch (feature) {
    case "ears":
      return (
        <g fill={accent}>
          <ellipse cx="21" cy="16" rx="6" ry="8" />
          <ellipse cx="43" cy="16" rx="6" ry="8" />
        </g>
      );
    case "antenna":
      return (
        <g stroke={accent} strokeWidth="2.4" fill={accent}>
          <line x1="32" y1="16" x2="32" y2="6" />
          <circle cx="32" cy="4" r="3" stroke="none" />
        </g>
      );
    case "sprout":
      return (
        <g fill={accent}>
          <path d="M32 15 C32 6 26 3 22 3 C24 10 27 14 32 15 Z" />
          <path d="M32 15 C32 6 38 3 42 3 C40 10 37 14 32 15 Z" />
        </g>
      );
    case "shell":
      return (
        <path
          d="M12 38 A20 20 0 0 1 52 38 Z"
          fill={accent}
          opacity="0.5"
        />
      );
    case "wings":
      return (
        <g fill={accent} opacity="0.7">
          <path d="M14 32 C4 26 4 40 15 42 Z" />
          <path d="M50 32 C60 26 60 40 49 42 Z" />
        </g>
      );
    case "horn":
      return <path d="M32 14 l-3 -10 6 0 Z" fill={accent} />;
    case "tuft":
      return (
        <path
          d="M26 14 q6 -12 12 0 q-6 -4 -12 0 Z"
          fill={accent}
        />
      );
    default:
      return null;
  }
}

export function Critter({
  id,
  size = 44,
}: {
  id: CreatureId;
  size?: number;
}) {
  const spec = SPEC[id];
  const cat = CATEGORIES[ROSTER[id].category];
  const fill = spec.fill ?? cat.hue;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={ROSTER[id].name}
    >
      <ellipse cx="32" cy="57" rx="16" ry="4" fill="#00000012" />
      {featureEls(spec.feature, spec.accent)}
      <g fill={fill}>{bodyPath(spec.body)}</g>
      {/* face */}
      <g fill="#3a3733">
        <circle cx="26" cy="34" r="2.6" />
        <circle cx="38" cy="34" r="2.6" />
      </g>
      <circle cx="26.9" cy="33.1" r="0.9" fill="#fff" />
      <circle cx="38.9" cy="33.1" r="0.9" fill="#fff" />
      <path
        d="M27 40 q5 4 10 0"
        fill="none"
        stroke="#3a3733"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g fill="#ffffff" opacity="0.14">{bodyPath(spec.body)}</g>
      <ellipse cx="24" cy="27" rx="5" ry="3" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}
