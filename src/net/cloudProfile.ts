import { supabase } from "./supabase";
import type { Profile } from "../ui/profile";

/* Sync the local Profile to a per-user row in Supabase. Table:
 *
 *   create table public.profiles (
 *     id uuid primary key references auth.users(id) on delete cascade,
 *     data jsonb not null default '{}',
 *     updated_at timestamptz not null default now()
 *   );
 *
 * with row-level security so a user can only read/write their own row
 * (see .env.example for the full SQL). */

/** the signed-in user's stored profile, or null if they have no row yet */
export async function pullProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("data")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data.data ?? null) as Profile | null;
}

/** upsert the whole profile blob for this user */
export async function pushProfile(
  userId: string,
  profile: Profile,
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("profiles")
    .upsert(
      { id: userId, data: profile, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
}
