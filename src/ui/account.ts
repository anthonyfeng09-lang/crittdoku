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
  /** true after clicking a password-reset link: the UI should collect a new one */
  recovering: boolean;
  /** flips each time an explicit sign-in / sign-up succeeds (for "go home") */
  authNonce: number;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  sendReset: (email: string) => Promise<boolean>;
  setPassword: (password: string) => Promise<boolean>;
  clearError: () => void;
}

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password.";
  if (m.includes("already registered")) return "That email already has an account.";
  if (m.includes("password should be")) return "Password needs at least 6 characters.";
  if (m.includes("unable to validate email")) return "That does not look like an email.";
  if (m.includes("email not confirmed")) return "Check your inbox to confirm your email first.";
  if (m.includes("same password")) return "That is already your password.";
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
  const [recovering, setRecovering] = useState(false);
  const [authNonce, setAuthNonce] = useState(0);
  const mounted = useRef(true);
  // set right before an explicit sign-in / sign-up so we can tell a real
  // "you just logged in" SIGNED_IN apart from a session restored on page load
  const explicit = useRef(false);

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
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      setStatus(session ? "in" : "out");
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_IN" && explicit.current) {
        explicit.current = false;
        setAuthNonce((n) => n + 1);
      }
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
    (em: string, pw: string) => {
      explicit.current = true;
      return run(() =>
        supabase!.auth.signUp({ email: em.trim(), password: pw }),
      ).then((ok) => {
        if (!ok) explicit.current = false;
        return ok;
      });
    },
    [run],
  );
  const signIn = useCallback(
    (em: string, pw: string) => {
      explicit.current = true;
      return run(() =>
        supabase!.auth.signInWithPassword({ email: em.trim(), password: pw }),
      ).then((ok) => {
        if (!ok) explicit.current = false;
        return ok;
      });
    },
    [run],
  );
  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const sendReset = useCallback(
    (em: string) =>
      run(() =>
        supabase!.auth.resetPasswordForEmail(em.trim(), {
          redirectTo: window.location.origin,
        }),
      ),
    [run],
  );
  const setPassword = useCallback(
    async (pw: string) => {
      const ok = await run(() => supabase!.auth.updateUser({ password: pw }));
      if (ok) {
        setRecovering(false);
        setAuthNonce((n) => n + 1);
      }
      return ok;
    },
    [run],
  );

  return {
    configured: supabaseReady,
    status,
    userId,
    email,
    error,
    busy,
    recovering,
    authNonce,
    signUp,
    signIn,
    signOut,
    sendReset,
    setPassword,
    clearError: () => setError(null),
  };
}
