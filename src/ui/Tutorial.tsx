import { Critter } from "./Critter";

/* A one-minute rules read. Static, illustrated with a few critters. */

const STEPS: Array<{ n: string; title: string; body: string; art?: string }> = [
  {
    n: "1",
    title: "Draft from the pool",
    body: "Take turns pulling one critter out of the pond. There is no cost, but the pool is small, so grab what fits your plan. Spend a forage token to send the whole pool under and call up a fresh one. Then bind your nine critters to the digits 1 to 9.",
    art: "shellclam",
  },
  {
    n: "2",
    title: "Place a legal digit",
    body: "The grid starts nearly empty. On your turn place one digit in any empty cell, as long as it does not repeat in that row, that column or that 3x3 box. There is no fixed solution: legality is the only rule.",
    art: "boulderpup",
  },
  {
    n: "3",
    title: "Hold the ground",
    body: "When play freezes, every row, column and box is scored for whoever holds the most cells in it. Finishing a region early locks it to you for a bonus. Most cells wins the region; most regions wins the match.",
    art: "mossback",
  },
  {
    n: "4",
    title: "Spend energy on abilities",
    body: "Placing digits and claiming regions earns energy. Your critters spend it: hop a cell to a neighbour, place twice in a turn, lay a mine the opponent must clear, remove a contested digit, or place ignoring the rules.",
    art: "thornpod",
  },
  {
    n: "5",
    title: "Play the timing",
    body: "Some critters sleep a turn or two, then wake and snap up any region you already lead. Others store energy, protect a region from being locked, or grow back after they are removed. Check the Critterdex for exactly what each one does.",
    art: "fogkit",
  },
];

export function Tutorial({
  onDone,
  onHome,
  onDex,
}: {
  onDone: () => void;
  onHome: () => void;
  onDex: () => void;
}) {
  return (
    <div className="app">
      <div className="appbar">
        <h1>CRITTDOKU</h1>
        <span className="status">How to play</span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button onClick={onHome}>Menu</button>
          <button onClick={onDex}>Critterdex</button>
          <button className="primary" onClick={onDone}>
            Face a bot
          </button>
        </div>
      </div>
      <main className="stage tutorial">
        <div className="tut-scroll">
          {STEPS.map((s) => (
            <section key={s.n} className="tut-step">
              <div className="tut-num">{s.n}</div>
              {s.art && <Critter id={s.art as never} size={72} />}
              <div className="tut-text">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </section>
          ))}
          <button className="tut-go" onClick={onDone}>
            Face a bot
          </button>
        </div>
      </main>
    </div>
  );
}
