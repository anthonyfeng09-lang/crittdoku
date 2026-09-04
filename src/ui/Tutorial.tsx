import { Critter } from "./Critter";
import { translator } from "./i18n";

/* A one-minute rules read. Static, illustrated with a few critters. */

const STEPS: Array<{ n: string; k: string; art: string }> = [
  { n: "1", k: "tut1", art: "shellclam" },
  { n: "2", k: "tut2", art: "boulderpup" },
  { n: "3", k: "tut3", art: "mossback" },
  { n: "4", k: "tut4", art: "thornpod" },
  { n: "5", k: "tut5", art: "fogkit" },
];

export function Tutorial({
  lang,
  onDone,
  onHome,
  onDex,
}: {
  lang: string;
  onDone: () => void;
  onHome: () => void;
  onDex: () => void;
}) {
  const t = translator(lang);
  return (
    <div className="app">
      <div className="appbar">
        <h1>CRITTDOKU</h1>
        <span className="status">{t("howToPlay")}</span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button onClick={onHome}>{t("menu")}</button>
          <button onClick={onDex}>{t("dex")}</button>
          <button className="primary" onClick={onDone}>
            {t("faceBot")}
          </button>
        </div>
      </div>
      <main className="stage tutorial">
        <div className="tut-scroll">
          {STEPS.map((s) => (
            <section key={s.n} className="tut-step">
              <div className="tut-num">{s.n}</div>
              <Critter id={s.art as never} size={72} />
              <div className="tut-text">
                <h3>{t(`${s.k}Title` as never)}</h3>
                <p>{t(`${s.k}Body` as never)}</p>
              </div>
            </section>
          ))}
          <button className="tut-go" onClick={onDone}>
            {t("faceBot")}
          </button>
        </div>
      </main>
    </div>
  );
}
