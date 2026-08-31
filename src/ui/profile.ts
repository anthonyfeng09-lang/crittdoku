import { CreatureId } from "../engine";

/* A local profile, kept in this browser only. No server, no sign-in: it is
 * somewhere to hang a name, an avatar, a running record and a match log so
 * the game remembers you between sessions. It can be exported as a string
 * and pasted back in on another device. */

const KEY = "dendoku.profile.v1";

export interface MatchRecord {
  at: number;
  mode: "bot" | "local";
  opp: string; // "Chill bot", "Sharp bot", "Local"
  result: "win" | "loss" | "draw";
  you: number;
  them: number;
  team: CreatureId[];
}

export interface Profile {
  name: string;
  avatar: CreatureId | null;
  createdAt: number;
  wins: number;
  losses: number;
  draws: number;
  played: number;
  streak: number; // + win streak, - loss streak
  best: number; // best win streak
  favourite: CreatureId | null;
  history: MatchRecord[];
  lang: string;
}

const BLANK: Profile = {
  name: "Player",
  avatar: null,
  createdAt: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  played: 0,
  streak: 0,
  best: 0,
  favourite: null,
  history: [],
  lang: "en",
};

const HISTORY_CAP = 30;

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...BLANK, createdAt: Date.now() };
    const p = { ...BLANK, ...(JSON.parse(raw) as Partial<Profile>) };
    if (!p.createdAt) p.createdAt = Date.now();
    if (!Array.isArray(p.history)) p.history = [];
    return p;
  } catch {
    return { ...BLANK, createdAt: Date.now() };
  }
}

export function saveProfile(p: Profile): Profile {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode / storage off: keep going in memory */
  }
  return p;
}

/** most-drafted critter across the match log */
function computeFavourite(history: MatchRecord[]): CreatureId | null {
  const count = new Map<CreatureId, number>();
  for (const m of history)
    for (const id of m.team) count.set(id, (count.get(id) ?? 0) + 1);
  let best: CreatureId | null = null;
  let n = 0;
  for (const [id, c] of count) if (c > n) ((best = id), (n = c));
  return best;
}

export function recordMatch(
  p: Profile,
  rec: Omit<MatchRecord, "at">,
): Profile {
  const entry: MatchRecord = { ...rec, at: Date.now() };
  const history = [entry, ...p.history].slice(0, HISTORY_CAP);
  const next: Profile = { ...p, history, played: p.played + 1 };
  if (rec.result === "win") {
    next.wins += 1;
    next.streak = p.streak > 0 ? p.streak + 1 : 1;
    next.best = Math.max(p.best, next.streak);
  } else if (rec.result === "loss") {
    next.losses += 1;
    next.streak = p.streak < 0 ? p.streak - 1 : -1;
  } else {
    next.draws += 1;
    next.streak = 0;
  }
  if (!next.avatar) next.avatar = computeFavourite(history);
  next.favourite = computeFavourite(history);
  return saveProfile(next);
}

export function resetProfile(keep: Pick<Profile, "name" | "lang">): Profile {
  return saveProfile({
    ...BLANK,
    name: keep.name,
    lang: keep.lang,
    createdAt: Date.now(),
  });
}

/** portable backup: base64 of the JSON */
export function exportProfile(p: Profile): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  } catch {
    return "";
  }
}
export function importProfile(code: string): Profile | null {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (typeof p !== "object" || typeof p.name !== "string") return null;
    return saveProfile({ ...BLANK, ...p });
  } catch {
    return null;
  }
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
export function rankFor(wins: number): {
  name: string;
  at: number;
  next: number | null;
} {
  let r = RANKS[0];
  for (const step of RANKS) if (wins >= step.at) r = step;
  const idx = RANKS.indexOf(r);
  const next = idx + 1 < RANKS.length ? RANKS[idx + 1].at : null;
  return { name: r.name, at: r.at, next };
}
