import { useState } from "react";
import { ALL_CREATURES } from "../engine";
import { Critter } from "./Critter";
import { translator, LANGS } from "./i18n";
import { rankFor, type Profile } from "./profile";

/* The front door: pick a mode, see your record, tweak your name. */

export type Mode = "bot" | "local";
export type BotLevel = "chill" | "sharp";

// a few friendly faces bobbing along the bottom of the menu
const PARADE = [
  "boulderpup",
  "breezefinch",
  "snoozemouse",
  "nutsquirrel",
  "shellclam",
  "swiftwren",
] as const;

export function Home({
  profile,
  onName,
  onLang,
  onStart,
  onTutorial,
  onDex,
}: {
  profile: Profile;
  onName: (name: string) => void;
  onLang: (lang: string) => void;
  onStart: (mode: Mode, level: BotLevel) => void;
  onTutorial: () => void;
  onDex: () => void;
}) {
  const t = translator(profile.lang);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.name);
  const [level, setLevel] = useState<BotLevel>("chill");
  const rank = rankFor(profile.wins);

  const commitName = () => {
    const n = draft.trim().slice(0, 16) || "Player";
    onName(n);
    setDraft(n);
    setEditing(false);
  };

  return (
    <div className="app home">
      <div className="home-top">
        <h1 className="home-wordmark">DENDOKU</h1>
        <p className="home-tag">{t("tagline")}</p>
      </div>

      <div className="home-profile">
        <div className="hp-badge">{rank.name.charAt(0)}</div>
        <div className="hp-main">
          {editing ? (
            <div className="hp-name-edit">
              <input
                autoFocus
                value={draft}
                maxLength={16}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitName()}
              />
              <button className="primary" onClick={commitName}>
                ok
              </button>
            </div>
          ) : (
            <div className="hp-name">
              {profile.name}
              <button className="linkish" onClick={() => setEditing(true)}>
                {t("editName")}
              </button>
            </div>
          )}
          <div className="hp-stats">
            <span>
              {t("rank")}: <b>{rank.name}</b>
            </span>
            <span>
              {t("record")}:{" "}
              <b>
                {profile.wins}-{profile.losses}
                {profile.draws ? `-${profile.draws}` : ""}
              </b>
            </span>
            <span>
              {t("streak")}:{" "}
              <b>
                {profile.streak === 0
                  ? "-"
                  : profile.streak > 0
                    ? `${profile.streak}W`
                    : `${-profile.streak}L`}
              </b>
            </span>
          </div>
        </div>
        <select
          className="hp-lang"
          value={profile.lang}
          onChange={(e) => onLang(e.target.value)}
          aria-label="language"
        >
          {Object.entries(LANGS).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="home-modes">
        <button className="mode-card" onClick={() => onStart("bot", level)}>
          <span className="mc-title">{t("playBot")}</span>
          <span className="mc-sub">{t("playBotSub")}</span>
          <span
            className="mc-diff"
            onClick={(e) => {
              e.stopPropagation();
              setLevel((l) => (l === "chill" ? "sharp" : "chill"));
            }}
          >
            {t("difficulty")}: <b>{t(level)}</b>
          </span>
        </button>

        <button className="mode-card" onClick={() => onStart("local", level)}>
          <span className="mc-title">{t("playLocal")}</span>
          <span className="mc-sub">{t("playLocalSub")}</span>
        </button>

        <button className="mode-card" onClick={onTutorial}>
          <span className="mc-title">{t("howto")}</span>
          <span className="mc-sub">{t("howtoSub")}</span>
        </button>

        <button className="mode-card disabled" disabled>
          <span className="mc-badge">{t("soon")}</span>
          <span className="mc-title">{t("online")}</span>
          <span className="mc-sub">{t("onlineSub")}</span>
        </button>
      </div>

      <div className="home-foot">
        <button onClick={onDex}>{t("dex")}</button>
        <span className="hint" style={{ margin: 0 }}>
          {ALL_CREATURES.length} critters
        </span>
      </div>

      <div className="home-parade" aria-hidden="true">
        {PARADE.map((id, i) => (
          <span key={id} style={{ animationDelay: `${i * -0.5}s` }}>
            <Critter id={id} size={52} />
          </span>
        ))}
      </div>
    </div>
  );
}
