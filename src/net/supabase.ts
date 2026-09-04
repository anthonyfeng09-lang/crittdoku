import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Optional cloud backend. If the two env vars are set (see .env.example) the
 * app gets real email/password accounts and the profile syncs to a
 * `profiles` table; if they are absent everything still works, just local to
 * this browser. Nothing here throws when it is not configured. */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseReady = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
