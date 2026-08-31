import { CreatureId } from "../engine";

/* A local profile, kept in this browser only. No server, no account: it is
 * just somewhere to hang a name and a running record so the game remembers
 * you between sessions. */

const KEY = "dendoku.profile.v1";

export interface Profile {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  played: number;
  streak: number; // positive = win streak, negative = loss streak
  best: number; // best win streak
  favourite: CreatureId | null;
  lang: string;
}

const BLANK: Profile = {
  name: "Player",
  wins: 0,
  losses: 0,
  draws: 0,
  played: 0,
  streak: 0,
  best: 0,
  favourite: null,
  lang: "en",
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...BLANK };
    return { ...BLANK, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return { ...BLANK };
  }
}

export function saveProfile(p: Profile): Profile {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode / storage disabled: keep going in memory */
  }
  return p;
}

export function recordResult(
  p: Profile,
  outcome: "win" | "loss" | "draw",
): Profile {
  const next: Profile = { ...p, played: p.played + 1 };
  if (outcome === "win") {
    next.wins += 1;
    next.streak = p.streak > 0 ? p.streak + 1 : 1;
    next.best = Math.max(p.best, next.streak);
  } else if (outcome === "loss") {
    next.losses += 1;
    next.streak = p.streak < 0 ? p.streak - 1 : -1;
  } else {
    next.draws += 1;
    next.streak = 0;
  }
  return saveProfile(next);
}

/** a light rank ladder from total wins, for a bit of progression flavour */
const RANKS = [
  { at: 0, name: "Sprout" },
  { at: 3, name: "Forager" },
  { at: 8, name: "Pathfinder" },
  { at: 16, name: "Grovekeeper" },
  { at: 28, name: "Wildwarden" },
  { at: 44, name: "Elder" },
];
export function rankFor(wins: number): { name: string; next: number | null } {
  let r = RANKS[0];
  for (const step of RANKS) if (wins >= step.at) r = step;
  const idx = RANKS.indexOf(r);
  const next = idx + 1 < RANKS.length ? RANKS[idx + 1].at : null;
  return { name: r.name, next };
}
