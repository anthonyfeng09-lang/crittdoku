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
  ranked?: boolean;
  rp?: number; // rp change, if ranked
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
  rp: number; // ranked points, only moves in ranked matches
  rankedWins: number;
  rankedLosses: number;
  peakRp: number;
  tungified?: boolean; // cosmetic reskin toggle
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
  rp: 60,
  rankedWins: 0,
  rankedLosses: 0,
  peakRp: 60,
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

const RP_WIN = 34;
const RP_LOSS = 27;
const RP_DRAW = 2;

export function recordMatch(
  p: Profile,
  rec: Omit<MatchRecord, "at" | "rp">,
): Profile {
  const next: Profile = { ...p, played: p.played + 1 };
  let rpDelta = 0;

  if (rec.ranked) {
    // a small comeback bonus when you are on a losing streak, so a bad run
    // still claws back
    const bonus = p.streak <= -3 ? 6 : 0;
    rpDelta =
      rec.result === "win"
        ? RP_WIN + bonus
        : rec.result === "loss"
          ? -RP_LOSS
          : RP_DRAW;
    next.rp = Math.max(0, p.rp + rpDelta);
    next.peakRp = Math.max(p.peakRp, next.rp);
    if (rec.result === "win") next.rankedWins += 1;
    else if (rec.result === "loss") next.rankedLosses += 1;
  }

  const entry: MatchRecord = {
    ...rec,
    at: Date.now(),
    rp: rec.ranked ? rpDelta : undefined,
  };
  const history = [entry, ...p.history].slice(0, HISTORY_CAP);
  next.history = history;

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

/* ---- the 9-tier ranked ladder ---- */

const TIERS: Array<{ at: number; name: string }> = [
  { at: 0, name: "Pebble" },
  { at: 120, name: "Meadow" },
  { at: 260, name: "Thicket" },
  { at: 420, name: "Brook" },
  { at: 620, name: "Grove" },
  { at: 860, name: "Ridge" },
  { at: 1150, name: "Canopy" },
  { at: 1500, name: "Summit" },
  { at: 1950, name: "Apex" },
];

export interface RankInfo {
  tier: number; // 0..8
  name: string;
  nextName: string | null;
  floor: number;
  next: number | null; // rp for the next tier, or null at Apex
  have: number; // rp above the current tier floor
  need: number; // rp span of the current tier (have / need)
  progress: number; // 0..1 within the current tier
}

export function rankFromRp(rp: number): RankInfo {
  let tier = 0;
  for (let i = 0; i < TIERS.length; i++) if (rp >= TIERS[i].at) tier = i;
  const floor = TIERS[tier].at;
  const next = tier + 1 < TIERS.length ? TIERS[tier + 1].at : null;
  const need = next == null ? 1 : next - floor;
  const have = Math.min(need, rp - floor);
  return {
    tier,
    name: TIERS[tier].name,
    nextName: tier + 1 < TIERS.length ? TIERS[tier + 1].name : null,
    floor,
    next,
    have,
    need,
    progress: next == null ? 1 : have / need,
  };
}

export const TIER_COUNT = TIERS.length;

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

