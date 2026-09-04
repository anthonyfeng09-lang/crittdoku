import { useState } from "react";
import { ALL_CREATURES } from "../engine";
import { Critter } from "./Critter";
import { translator, tierName } from "./i18n";
import { LangMenu } from "./LangMenu";
import { Mark } from "./Mark";
import { useTung } from "./tungContext";
import { rankFromRp, type Profile } from "./profile";

/* The front door: pick a mode, see your record, tweak your name. */

export type Mode = "bot" | "local" | "online";
export type BotLevel = "chill" | "keen" | "sharp" | "fierce";
export const BOT_LEVELS: BotLevel[] = ["chill", "keen", "sharp", "fierce"];

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
  onLang,
  onProfile,
  onStart,
  onQueue,
  onOnline,
  onTutorial,
  onDex,
}: {
  profile: Profile;
  onLang: (lang: string) => void;
  onProfile: () => void;
  onStart: (mode: Mode, level: BotLevel) => void;
  onQueue: (kind: "ranked" | "casual") => void;
  onOnline: () => void;
  onTutorial: () => void;
  onDex: () => void;
}) {
  const t = translator(profile.lang);
  const tung = useTung();
  const [level, setLevel] = useState<BotLevel>("chill");
  const rank = rankFromRp(profile.rp);
  const rname = tierName(profile.lang, rank.tier);
  const nextName = rank.next == null ? "" : tierName(profile.lang, rank.tier + 1);

  return (
    <div className="app home">
      <div className="home-top">
        <Mark home />
        <p className="home-tag">{t("tagline")}</p>
      </div>

      <div className="home-profile">
        <button className="hp-badge as-btn" onClick={onProfile} title="your account">
          {profile.avatar ? (
            <Critter id={profile.avatar} size={40} />
          ) : (
            rname.charAt(0)
          )}
        </button>
        <button className="hp-main as-btn" onClick={onProfile}>
          <div className="hp-name">
            {profile.name}
            <span className="linkish">{t("editName")}</span>
          </div>
          <div className="hp-stats">
            <span>
              {t("rank")}: <b>{rname}</b>
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
        </button>
        <LangMenu value={profile.lang} onChange={onLang} />
      </div>

      <div className="home-modes">
        <button
          className="mode-card ranked"
          onClick={() => onQueue("ranked")}
        >
          <span className="mc-rank">
            {rname} · {rank.tier + 1}/9
          </span>
          <span className="mc-title">{t("ranked")}</span>
          <div className="mc-bar">
            <span style={{ width: `${Math.round(rank.progress * 100)}%` }} />
          </div>
          <span className="mc-rp">
            {rank.next == null
              ? `${profile.rp} RP · ${t("topTier")}`
              : t("rpToNext", {
                  have: rank.have,
                  need: rank.need,
                  next: nextName,
                })}
          </span>
        </button>

        <button className="mode-card" onClick={() => onQueue("casual")}>
          <span className="mc-title">{t("quick")}</span>
          <span className="mc-sub">{t("quickSub")}</span>
        </button>

        <button className="mode-card" onClick={() => onStart("bot", level)}>
          <span className="mc-title">{t("playBot")}</span>
          <span className="mc-sub">{t("playBotSub")}</span>
          <span
            className="mc-diff"
            onClick={(e) => {
              e.stopPropagation();
              setLevel(
                (l) =>
                  BOT_LEVELS[
                    (BOT_LEVELS.indexOf(l) + 1) % BOT_LEVELS.length
                  ],
              );
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

        <button className="mode-card" onClick={onOnline}>
          <span className="mc-title">{t("online")}</span>
          <span className="mc-sub">{t("onlineSub")}</span>
        </button>
      </div>

      <button className="dex-pill" onClick={onDex}>
        <span className="dex-pill-icon" aria-hidden="true">
          <Critter id="glidewing" size={26} />
        </span>
        <span className="dex-pill-text">
          <b>{tung ? t("tungdex") : t("dex")}</b>
          <span>
            {ALL_CREATURES.length} {t("dexSub")}
          </span>
        </span>
        <span className="dex-pill-arrow" aria-hidden="true">
          &rsaquo;
        </span>
      </button>

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
