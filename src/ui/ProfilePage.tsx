import { useMemo, useState } from "react";
import { ALL_CREATURES, ROSTER, CATEGORIES, CreatureId } from "../engine";
import { Critter } from "./Critter";
import { rankFromRp, type Profile } from "./profile";
import { translator, tierName, type TKey } from "./i18n";
import { Mark } from "./Mark";
import type { Account } from "./account";

/* The account page: name, avatar, rank progress, lifetime stats, match log,
 * and an email/password sign-in that syncs the profile to the cloud so it
 * follows you between devices. */

function ago(t: ReturnType<typeof translator>, ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return t("justNow");
  if (s < 3600) return t("minsAgo", { n: Math.floor(s / 60) });
  if (s < 86400) return t("hoursAgo", { n: Math.floor(s / 3600) });
  return t("daysAgo", { n: Math.floor(s / 86400) });
}

export function ProfilePage({
  profile,
  account,
  cloudSynced,
  onChange,
  onTungify,
  onHome,
}: {
  profile: Profile;
  account: Account;
  cloudSynced: boolean;
  onChange: (p: Profile) => void;
  onTungify: (mode: "on" | "off") => void;
  onHome: () => void;
}) {
  const t = translator(profile.lang);
  const [name, setName] = useState(profile.name);
  const [pickAvatar, setPickAvatar] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "reset">("signin");

  const rank = rankFromRp(profile.rp);
  const rname = tierName(profile.lang, rank.tier);
  const rate =
    profile.played > 0
      ? Math.round((profile.wins / profile.played) * 100)
      : 0;
  const ERR_KEYS = new Set([
    "wrongLogin",
    "emailTaken",
    "passwordShort",
    "badEmail",
    "confirmFirst",
    "samePassword",
  ]);
  const err = account.error
    ? ERR_KEYS.has(account.error)
      ? t(account.error as TKey)
      : account.error
    : "";

  const teamCounts = useMemo(() => {
    const m = new Map<CreatureId, number>();
    for (const rec of profile.history)
      for (const id of rec.team) m.set(id, (m.get(id) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [profile.history]);

  const progress = Math.max(0, Math.min(1, rank.progress));

  const commitName = () => {
    const n = name.trim().slice(0, 16) || "Player";
    setName(n);
    onChange({ ...profile, name: n });
  };

  return (
    <div className="app">
      <div className="appbar">
        <Mark />
        <span className="status">{t("yourAccount")}</span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button onClick={onHome}>{t("menu")}</button>
        </div>
      </div>

      <main className="stage profile">
        <div className="prof-scroll">
          <section className="prof-card prof-id">
            <button
              className="prof-avatar"
              onClick={() => setPickAvatar((v) => !v)}
              title={t("pickAnAvatar")}
            >
              {profile.avatar ? (
                <Critter id={profile.avatar} size={72} />
              ) : (
                <span>{rname.charAt(0)}</span>
              )}
              <span className="pa-edit">{t("editName")}</span>
            </button>
            <div className="prof-id-main">
              <div className="prof-name-row">
                <input
                  value={name}
                  maxLength={16}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => e.key === "Enter" && commitName()}
                />
              </div>
              <div className="prof-rank">
                <b>
                  {rname}{" "}
                  <span className="pr-tier">
                    {t("tierLabel", { n: rank.tier + 1 })}
                  </span>
                </b>
                <div className="prof-bar">
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
                <span className="hint" style={{ margin: 0 }}>
                  {rank.next == null
                    ? t("rpTopTier", { rp: profile.rp })
                    : t("rpToPromote", {
                        rp: profile.rp,
                        n: rank.next - profile.rp,
                      })}
                  {" · "}
                  {t("rankedTally", {
                    w: profile.rankedWins,
                    l: profile.rankedLosses,
                  })}
                </span>
              </div>
            </div>
          </section>

          {pickAvatar && (
            <section className="prof-card">
              <div className="hint" style={{ marginTop: 0 }}>
                {t("pickAnAvatar")}
              </div>
              <div className="avatar-grid">
                {ALL_CREATURES.map((id) => (
                  <button
                    key={id}
                    className={`avatar-opt ${profile.avatar === id ? "on" : ""}`}
                    onClick={() => {
                      onChange({ ...profile, avatar: id });
                      setPickAvatar(false);
                    }}
                    title={ROSTER[id].name}
                  >
                    <Critter id={id} size={40} />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="prof-card">
            <div className="stat-grid">
              <div className="stat">
                <b>{profile.played}</b>
                <span>{t("played")}</span>
              </div>
              <div className="stat">
                <b>{profile.wins}</b>
                <span>{t("won")}</span>
              </div>
              <div className="stat">
                <b>{profile.losses}</b>
                <span>{t("lost")}</span>
              </div>
              <div className="stat">
                <b>{rate}%</b>
                <span>{t("winRate")}</span>
              </div>
              <div className="stat">
                <b>
                  {profile.streak === 0
                    ? "-"
                    : profile.streak > 0
                      ? `${profile.streak}W`
                      : `${-profile.streak}L`}
                </b>
                <span>{t("streak")}</span>
              </div>
              <div className="stat">
                <b>{profile.best}</b>
                <span>{t("bestStreak")}</span>
              </div>
            </div>
          </section>

          {teamCounts.length > 0 && (
            <section className="prof-card">
              <div className="hint" style={{ marginTop: 0 }}>
                {t("mostDrafted")}
              </div>
              <div className="fav-row">
                {teamCounts.map(([id, n]) => (
                  <div key={id} className="fav">
                    <Critter id={id} size={40} />
                    <span className="fav-name">{ROSTER[id].name}</span>
                    <span
                      className="type-chip sm"
                      style={{ background: CATEGORIES[ROSTER[id].category].hue }}
                    >
                      x{n}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="prof-card">
            <div className="hint" style={{ marginTop: 0, marginBottom: 6 }}>
              {t("matchHistory")}
            </div>
            {profile.history.length === 0 && (
              <div className="hint">{t("noMatches")}</div>
            )}
            <div className="hist">
              {profile.history.map((m, i) => (
                <div key={i} className={`hist-row ${m.result}`}>
                  <span className={`hist-badge ${m.result}`}>
                    {m.result === "win"
                      ? "W"
                      : m.result === "loss"
                        ? "L"
                        : "D"}
                  </span>
                  <span className="hist-score">
                    {m.you}&ndash;{m.them}
                  </span>
                  <span className="hist-opp">{m.opp}</span>
                  <span className="hist-team">
                    {m.team.slice(0, 5).map((id) => (
                      <Critter key={id} id={id} size={18} />
                    ))}
                  </span>
                  <span className="hist-when">{ago(t, m.at)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="prof-card prof-auth">
            <div className="hint" style={{ marginTop: 0 }}>
              {t("account")}
            </div>

            {!account.configured && (
              <p className="auth-note">{t("notSetUp")}</p>
            )}

            {account.configured && account.status === "loading" && (
              <p className="auth-note">{t("checkingSession")}</p>
            )}

            {account.configured && account.recovering && (
              <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                <p className="auth-note">{t("chooseNewPassword")}</p>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("newPasswordPh")}
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    account.clearError();
                  }}
                />
                <div className="auth-btns">
                  <button
                    className="auth-btn"
                    disabled={account.busy || pw.length < 6}
                    onClick={() => account.setPassword(pw)}
                  >
                    {t("saveNewPassword")}
                  </button>
                </div>
                {err && <p className="auth-err">{err}</p>}
              </form>
            )}

            {account.configured && !account.recovering && account.status === "in" && (
              <div className="auth-in">
                <p className="auth-note">
                  {t("signedInAs")} <b>{account.email}</b>
                  <br />
                  <span className="auth-sync">
                    {cloudSynced ? t("syncedCloud") : t("syncing")}
                  </span>
                </p>
                <button
                  className="auth-btn ghost"
                  disabled={account.busy}
                  onClick={() => account.signOut()}
                >
                  {t("signOut")}
                </button>
              </div>
            )}

            {account.configured &&
              !account.recovering &&
              account.status === "out" &&
              authMode === "signin" && (
                <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder={t("emailPh")}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      account.clearError();
                      setNotice("");
                    }}
                  />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder={t("passwordPh")}
                    value={pw}
                    onChange={(e) => {
                      setPw(e.target.value);
                      account.clearError();
                      setNotice("");
                    }}
                  />
                  <div className="auth-btns">
                    <button
                      className="auth-btn"
                      disabled={account.busy || !email || !pw}
                      onClick={() => account.signIn(email, pw)}
                    >
                      {t("signIn")}
                    </button>
                    <button
                      className="auth-btn ghost"
                      disabled={account.busy || !email || !pw}
                      onClick={async () => {
                        const ok = await account.signUp(email, pw);
                        if (ok) setNotice(t("accountCreated"));
                      }}
                    >
                      {t("createAccount")}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setAuthMode("reset");
                      setNotice("");
                      account.clearError();
                    }}
                  >
                    {t("forgotPassword")}
                  </button>
                  {err && <p className="auth-err">{err}</p>}
                  {notice && <p className="auth-note">{notice}</p>}
                </form>
              )}

            {account.configured &&
              !account.recovering &&
              account.status === "out" &&
              authMode === "reset" && (
                <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                  <p className="auth-note">{t("resetIntro")}</p>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder={t("emailPh")}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      account.clearError();
                      setNotice("");
                    }}
                  />
                  <div className="auth-btns">
                    <button
                      className="auth-btn"
                      disabled={account.busy || !email}
                      onClick={async () => {
                        const ok = await account.sendReset(email);
                        if (ok) setNotice(t("resetSent"));
                      }}
                    >
                      {t("sendResetLink")}
                    </button>
                    <button
                      className="auth-btn ghost"
                      onClick={() => {
                        setAuthMode("signin");
                        setNotice("");
                        account.clearError();
                      }}
                    >
                      {t("back")}
                    </button>
                  </div>
                  {err && <p className="auth-err">{err}</p>}
                  {notice && <p className="auth-note">{notice}</p>}
                </form>
              )}
          </section>

          <section className="prof-card prof-settings">
            <div className="hint" style={{ marginTop: 0 }}>
              {t("settings")}
            </div>
            <div className="set-row">
              <div className="set-text">
                <b>{t("tungifyName")}</b>
                <span className="auth-note" style={{ margin: 0 }}>
                  {t("tungifyHint")}
                </span>
              </div>
              <button
                className={`tung-toggle ${profile.tungified ? "on" : ""}`}
                role="switch"
                aria-checked={!!profile.tungified}
                onClick={() => onTungify(profile.tungified ? "off" : "on")}
              >
                <span className="tt-knob" />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
