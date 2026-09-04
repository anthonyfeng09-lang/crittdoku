import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Cloud backend for real email/password accounts + profile sync. These two
 * values are safe in the client bundle: the URL is public, and the
 * publishable key only works alongside the row-level-security policies in
 * SUPABASE.md (a signed-out request can read/write nothing). An env var
 * overrides the constant when set, so a fork can point at its own project
 * without editing source. */

const FALLBACK_URL = "https://oorlbmbonftdswvcnfmc.supabase.co";
const FALLBACK_KEY = "sb_publishable_intNkyNhybkv3HRYh44ueQ_OpfZJMwH";

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const anonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_KEY;

export const supabaseReady = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
