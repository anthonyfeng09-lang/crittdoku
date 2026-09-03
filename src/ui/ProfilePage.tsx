import { useMemo, useState } from "react";
import { ALL_CREATURES, ROSTER, CATEGORIES, CreatureId } from "../engine";
import { Critter } from "./Critter";
import {
  rankFromRp,
  exportProfile,
  importProfile,
  type Profile,
} from "./profile";

/* The account page. Local only, but it behaves like one: name, avatar,
 * rank progress, lifetime stats, match history, and an export/import so it
 * can move between browsers. */

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function ProfilePage({
  profile,
  onChange,
  onHome,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  onHome: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [pickAvatar, setPickAvatar] = useState(false);
  const [io, setIo] = useState<"none" | "export" | "import">("none");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const rank = rankFromRp(profile.rp);
  const rate =
    profile.played > 0
      ? Math.round((profile.wins / profile.played) * 100)
      : 0;

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
        <h1>CRITTDOKU</h1>
        <span className="status">Your account</span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button onClick={onHome}>Menu</button>
        </div>
      </div>

      <main className="stage profile">
        <div className="prof-scroll">
          <section className="prof-card prof-id">
            <button
              className="prof-avatar"
              onClick={() => setPickAvatar((v) => !v)}
              title="choose an avatar"
            >
              {profile.avatar ? (
                <Critter id={profile.avatar} size={72} />
              ) : (
                <span>{rank.name.charAt(0)}</span>
              )}
              <span className="pa-edit">edit</span>
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
                  {rank.name} <span className="pr-tier">tier {rank.tier + 1}/9</span>
                </b>
                <div className="prof-bar">
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
                <span className="hint" style={{ margin: 0 }}>
                  {rank.next == null
                    ? `${profile.rp} RP · top tier`
                    : `${profile.rp} RP · ${rank.next - profile.rp} to promote`}
                  {" · ranked "}
                  {profile.rankedWins}-{profile.rankedLosses}
                </span>
              </div>
            </div>
          </section>

          {pickAvatar && (
            <section className="prof-card">
              <div className="hint" style={{ marginTop: 0 }}>
                pick an avatar
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
                <span>played</span>
              </div>
              <div className="stat">
                <b>{profile.wins}</b>
                <span>won</span>
              </div>
              <div className="stat">
                <b>{profile.losses}</b>
                <span>lost</span>
              </div>
              <div className="stat">
                <b>{rate}%</b>
                <span>win rate</span>
              </div>
              <div className="stat">
                <b>
                  {profile.streak === 0
                    ? "-"
                    : profile.streak > 0
                      ? `${profile.streak}W`
                      : `${-profile.streak}L`}
                </b>
                <span>streak</span>
              </div>
              <div className="stat">
                <b>{profile.best}</b>
                <span>best streak</span>
              </div>
            </div>
          </section>

          {teamCounts.length > 0 && (
            <section className="prof-card">
              <div className="hint" style={{ marginTop: 0 }}>
                most drafted
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
              match history
            </div>
            {profile.history.length === 0 && (
              <div className="hint">no matches yet</div>
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
                  <span className="hist-when">{ago(m.at)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="prof-card prof-io">
            {io === "none" && (
              <>
                <div className="hint" style={{ marginTop: 0 }}>
                  move this profile between browsers
                </div>
                <div className="prof-io-btns">
                  <button onClick={() => { setIo("export"); setCode(exportProfile(profile)); setMsg(""); }}>
                    Export
                  </button>
                  <button onClick={() => { setIo("import"); setCode(""); setMsg(""); }}>
                    Import
                  </button>
                </div>
              </>
            )}
            {io === "export" && (
              <>
                <div className="hint" style={{ marginTop: 0 }}>
                  copy this code and paste it into Import on another browser
                </div>
                <textarea readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} />
                <div className="prof-io-btns">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(code);
                      setMsg("copied");
                    }}
                  >
                    Copy
                  </button>
                  <button onClick={() => setIo("none")}>Done</button>
                  {msg && <span className="hint" style={{ margin: 0 }}>{msg}</span>}
                </div>
              </>
            )}
            {io === "import" && (
              <>
                <div className="hint" style={{ marginTop: 0 }}>
                  paste an exported code
                </div>
                <textarea
                  value={code}
                  rows={3}
                  onChange={(e) => setCode(e.target.value)}
                />
                <div className="prof-io-btns">
                  <button
                    onClick={() => {
                      const p = importProfile(code);
                      if (p) {
                        onChange(p);
                        setIo("none");
                      } else {
                        setMsg("that code did not read");
                      }
                    }}
                  >
                    Load
                  </button>
                  <button onClick={() => setIo("none")}>Cancel</button>
                  {msg && <span className="hint" style={{ margin: 0 }}>{msg}</span>}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
