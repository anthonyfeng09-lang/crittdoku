import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseReady } from "../net/supabase";

/* Thin wrapper over Supabase email/password auth. Degrades to a permanent
 * "signed out, and you can't sign in" state when the backend isn't
 * configured, so the rest of the UI never has to special-case it. */

export type AuthStatus = "loading" | "out" | "in";

export interface Account {
  configured: boolean;
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  error: string | null;
  busy: boolean;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("already registered")) return "That email already has an account.";
  if (m.includes("password should be")) return "Password needs at least 6 characters.";
  if (m.includes("unable to validate email")) return "That does not look like an email.";
  if (m.includes("email not confirmed")) return "Check your inbox to confirm your email first.";
  return msg;
}

export function useAccount(): Account {
  const [status, setStatus] = useState<AuthStatus>(
    supabaseReady ? "loading" : "out",
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      const s = data.session;
      setUserId(s?.user.id ?? null);
      setEmail(s?.user.email ?? null);
      setStatus(s ? "in" : "out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted.current) return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      setStatus(session ? "in" : "out");
    });
    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const run = useCallback(
    async (fn: () => Promise<{ error: { message: string } | null }>) => {
      if (!supabase) return false;
      setBusy(true);
      setError(null);
      try {
        const { error: e } = await fn();
        if (e) {
          setError(friendly(e.message));
          return false;
        }
        return true;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [],
  );

  const signUp = useCallback(
    (em: string, pw: string) =>
      run(() => supabase!.auth.signUp({ email: em.trim(), password: pw })),
    [run],
  );
  const signIn = useCallback(
    (em: string, pw: string) =>
      run(() =>
        supabase!.auth.signInWithPassword({ email: em.trim(), password: pw }),
      ),
    [run],
  );
  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return {
    configured: supabaseReady,
    status,
    userId,
    email,
    error,
    busy,
    signUp,
    signIn,
    signOut,
    clearError: () => setError(null),
  };
}
