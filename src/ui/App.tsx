import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ABILITY_COST,
  ALL_CREATURES,
  ROSTER,
  CATEGORIES,
  Category,
  Action,
  CreatureId,
  GameState,
  Player,
  Seed,
  applyAction,
  cloneState,
  createGame,
  creaturesByCategory,
  generateSeeds,
  lastTouchedCell,
  legalActions,
  loadoutFromIds,
  projectedScore,
  snakeOrder,
  teamHas,
  territoryHolder,
} from "../engine";
import { makeRng } from "../engine/rng";
import {
  critterBot,
  fierceBot,
  randomActionBot,
  territoryBot,
  type Bot,
} from "../sim/bots";
import { Critter } from "./Critter";
import { MeadowScene } from "./Meadow";
import { Home, type Mode, type BotLevel } from "./Home";
import { Tutorial } from "./Tutorial";
import { ProfilePage } from "./ProfilePage";
import { Online } from "./Online";
import { Queue } from "./Queue";
import { randomHandle } from "./names";
import { loadProfile, saveProfile, recordMatch, type Profile } from "./profile";
import { useAccount } from "./account";
import { pullProfile, pushProfile } from "../net/cloudProfile";
import type { Net } from "../net/peer";

const SIZE = 9;
const NAMES = ["Sage", "Clay"] as const;
const MEADOW_SIZE = 12;
const START_ENERGY = 9; // each player brings this into the draft
const REROLL_COST = 2; // rerolling the pool spends it, straight from that pool
const CAT_ORDER: Category[] = [
  "anchor",
  "drift",
  "hush",
  "thrift",
  "ward",
  "snap",
];
const rc = (cell: number) => `r${Math.floor(cell / SIZE) + 1}c${(cell % SIZE) + 1}`;

interface AbilityInfo {
  name: string;
  label: string;
  cost: number;
  help: string;
}

/** which abilities a player's team can use, with prices */
function teamAbilities(g: GameState, p: Player): AbilityInfo[] {
  const out: AbilityInfo[] = [];
  if (teamHas(g, p, "moveAdjacent"))
    out.push({ name: "hop", label: "hop", cost: ABILITY_COST.hop, help: "move one of your cells to a neighbour" });
  if (teamHas(g, p, "canBurst"))
    out.push({ name: "extra", label: "burst", cost: ABILITY_COST.extra, help: "place a second digit this turn" });
  if (teamHas(g, p, "canWild"))
    out.push({ name: "wild", label: "wild", cost: ABILITY_COST.wild, help: "place ignoring the row/col/box rule" });
  if (teamHas(g, p, "canMole"))
    out.push({ name: "replace", label: "remove", cost: ABILITY_COST.replace, help: "remove an opponent digit in a contested region" });
  if (teamHas(g, p, "canMine"))
    out.push({ name: "mine", label: "mine", cost: ABILITY_COST.mine, help: "block a cell until the opponent clears it" });
  return out;
}

function actionLabel(a: Action): string {
  switch (a.type) {
    case "move":
      return `hop → ${rc(a.to)}  ${ABILITY_COST.hop}⚡`;
    case "mine":
      return `mine ${rc(a.cell)}  ${ABILITY_COST.mine}⚡`;
    case "clear":
      return `clear mine  ${ABILITY_COST.clear}⚡`;
    default:
      if (a.burst) return `${a.digit} + burst  ${ABILITY_COST.extra}⚡`;
      if (a.wild) return `✦ ${a.digit}  ${ABILITY_COST.wild}⚡`;
      return `${a.digit}`;
  }
}

function actionHelp(a: Action): string {
  if (a.type === "place" && "digit" in a && !a.wild && !a.burst) {
    return "place this digit";
  }
  if (a.type === "place" && a.burst) return "place, then place again this turn";
  if (a.type === "place" && a.wild) return "wild placement, ignores the rules";
  if (a.type === "place") return "remove the opponent digit here";
  return "";
}

interface Match {
  /** the two drafted teams, index 0 = first picker's team */
  draftTeams: [CreatureId[], CreatureId[]];
  seedCount: number;
  leg: 1 | 2;
  /** 1 for a quick game (vs bot), 2 for the hot-seat best-of-two */
  bestOf: 1 | 2;
  mode: Mode;
  botLevel: BotLevel;
  /** leftover draft energy [seat0, seat1] for leg 1 */
  startEnergy?: [number, number];
  ranked?: boolean;
  /** a bot match dressed up as a queue opponent; the display name */
  disguise?: string | null;
  /** [legIndex] -> [seat0 regions, seat1 regions] once that leg has ended */
  legScores: Array<[number, number] | null>;
}

/** In leg 1 seat 0 pilots team A and moves first. In leg 2 the teams swap
 *  and seat 1 moves first, so each player pilots each team once and any
 *  draft-order or team-strength edge cancels over the match. */
function legLoadouts(m: Match): [CreatureId[], CreatureId[]] {
  return m.leg === 1 ? m.draftTeams : [m.draftTeams[1], m.draftTeams[0]];
}

type Route =
  | "home"
  | "draft"
  | "play"
  | "tutorial"
  | "profile"
  | "online"
  | "queue";

export function App() {
  const [route, setRoute] = useState<Route>("home");
  const [mode, setMode] = useState<Mode>("bot");
  const [botLevel, setBotLevel] = useState<BotLevel>("chill");
  const [ranked, setRanked] = useState(false);
  const [queueKind, setQueueKind] = useState<"ranked" | "casual">("casual");
  // when a queue quietly falls back to a bot, wear a normal-looking handle
  const [disguise, setDisguise] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(() => loadProfile());

  // --- account + cloud profile sync ---
  const account = useAccount();
  const [cloudSynced, setCloudSynced] = useState(false);
  const syncingUid = useRef<string | null>(null);

  useEffect(() => {
    const uid = account.userId;
    if (!uid) {
      setCloudSynced(false);
      syncingUid.current = null;
      return;
    }
    if (syncingUid.current === uid) return;
    syncingUid.current = uid;
    setCloudSynced(false);
    let cancelled = false;
    (async () => {
      const remote = await pullProfile(uid);
      if (cancelled) return;
      if (remote) setProfile(saveProfile(remote));
      else await pushProfile(uid, loadProfile()); // first sign-in keeps local progress
      if (!cancelled) setCloudSynced(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [account.userId]);

  useEffect(() => {
    const uid = account.userId;
    if (!uid || !cloudSynced) return;
    const t = setTimeout(() => pushProfile(uid, profile), 800);
    return () => clearTimeout(t);
  }, [profile, account.userId, cloudSynced]);

  // reflect the chosen language on <html> for correct font shaping. The
  // layout stays LTR even for Arabic (the text still shapes right-to-left
  // within its runs) so every control keeps its place.
  useEffect(() => {
    document.documentElement.lang = profile.lang;
  }, [profile.lang]);

  // a password-reset link was clicked: land on the account page to set one
  useEffect(() => {
    if (account.recovering) setRoute("profile");
  }, [account.recovering]);

  // a fresh sign-in / sign-up / password change succeeded: back to the menu
  useEffect(() => {
    if (account.authNonce > 0) setRoute("home");
  }, [account.authNonce]);

  const [match, setMatch] = useState<Match | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [seedCount, setSeedCount] = useState(6);
  const [sel, setSel] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const botRng = useRef(makeRng(98765));
  const recorded = useRef<GameState | null>(null);

  // --- online ---
  const [net, setNet] = useState<Net | null>(null);
  const [mySeat, setMySeat] = useState<0 | 1>(0);
  const [onlineSeed, setOnlineSeed] = useState(1);
  const [netErr, setNetErr] = useState<string | null>(null);
  const online = mode === "online" && net ? { net, mySeat, seed: onlineSeed } : null;

  const oppBot: Bot =
    botLevel === "fierce"
      ? fierceBot
      : botLevel === "sharp"
        ? critterBot
        : botLevel === "keen"
          ? territoryBot
          : randomActionBot;

  const beginLeg = useCallback(
    (m: Match, presetSeeds?: Seed[], startEnergy?: [number, number]) => {
      const rng = makeRng((Date.now() ^ (m.seedCount * 40503) ^ m.leg) >>> 0);
      const seeds =
        presetSeeds ??
        generateSeeds({ size: SIZE, box: { rows: 3, cols: 3 } }, m.seedCount, rng);
      const t = legLoadouts(m);
      const e =
        startEnergy && m.leg === 1
          ? startEnergy
          : startEnergy && m.leg === 2
            ? ([startEnergy[1], startEnergy[0]] as [number, number])
            : undefined;
      setGame(
        createGame({
          rules: { endScoring: "majority" },
          seeds,
          firstPlayer: m.leg === 1 ? 0 : 1,
          startEnergy: e,
          loadouts: [loadoutFromIds(t[0], SIZE), loadoutFromIds(t[1], SIZE)],
        }),
      );
      setMatch(m);
      setSel(null);
      setAuto(false);
      setRoute("play");
    },
    [],
  );

  const startMatch = useCallback(
    (
      draftTeams: [CreatureId[], CreatureId[]],
      presetSeeds?: Seed[],
      startEnergy?: [number, number],
    ) =>
      beginLeg(
        {
          draftTeams,
          seedCount: presetSeeds ? presetSeeds.length : seedCount,
          leg: 1,
          bestOf: mode === "bot" || mode === "online" ? 1 : 2,
          mode,
          botLevel,
          startEnergy,
          ranked,
          disguise,
          legScores: [null, null],
        },
        presetSeeds,
        startEnergy,
      ),
    [beginLeg, seedCount, mode, botLevel, ranked, disguise],
  );

  const leaveOnline = useCallback(() => {
    net?.close();
    setNet(null);
    setNetErr(null);
  }, [net]);

  const commit = useCallback(
    (g: GameState) => {
      setGame(cloneState(g));
      if (
        g.status === "ended" &&
        match &&
        match.legScores[match.leg - 1] === null
      ) {
        const ls = match.legScores.slice() as Match["legScores"];
        ls[match.leg - 1] = [g.score[0], g.score[1]];
        setMatch({ ...match, legScores: ls });
        // log the match once, at the end (you are seat 0)
        const finished = match.bestOf === 1 || match.leg === 2;
        if (finished && recorded.current !== g) {
          recorded.current = g;
          const seat = match.mode === "online" ? mySeat : 0;
          const mine =
            g.score[seat] +
            (match.leg === 2 ? (match.legScores[0]?.[seat] ?? 0) : 0);
          const theirs =
            g.score[1 - seat] +
            (match.leg === 2 ? (match.legScores[0]?.[1 - seat] ?? 0) : 0);
          const opp = match.disguise
            ? match.disguise
            : match.mode === "local"
              ? "Local"
              : match.mode === "online"
                ? net?.peerName() ?? "Online"
                : `${match.botLevel[0].toUpperCase()}${match.botLevel.slice(1)} bot`;
          setProfile((p) =>
            recordMatch(p, {
              mode: match.mode === "online" || match.disguise ? "local" : match.mode,
              opp,
              ranked: match.ranked,
              result: mine === theirs ? "draw" : mine > theirs ? "win" : "loss",
              you: mine,
              them: theirs,
              team: legLoadouts(match)[seat].slice(),
            }),
          );
        }
      }
    },
    [match, mySeat, net],
  );

  const doAction = useCallback(
    (a: Action, fromNet = false) => {
      if (!game || game.status !== "playing") return;
      if (online && !fromNet && game.current !== online.mySeat) return;
      applyAction(game, a);
      commit(game);
      setSel(null);
      if (online && !fromNet) online.net.send({ t: "move", action: a });
    },
    [game, commit, online],
  );

  const botMove = useCallback(() => {
    if (!game || game.status !== "playing") return;
    applyAction(game, oppBot.choose(game, botRng.current));
    commit(game);
    setSel(null);
  }, [game, commit, oppBot]);

  // route inbound net messages to the live game / draft-start
  const netApi = useRef<(m: import("../net/peer").NetMsg) => void>(() => {});
  netApi.current = (m) => {
    if (m.t === "start") {
      setOnlineSeed(m.seed);
      setRanked(!!m.ranked);
      recorded.current = null;
      setGame(null);
      setMatch(null);
      setRoute("draft");
    } else if (m.t === "move") {
      doAction(m.action, true);
    } else if (m.t === "rematch") {
      setOnlineSeed(m.seed);
      recorded.current = null;
      setGame(null);
      setMatch(null);
      setRoute("draft");
    } else if (m.t === "bye") {
      setNetErr(`${net?.peerName() ?? "Your opponent"} left the match.`);
    }
  };
  useEffect(() => {
    if (!net) return;
    const offM = net.onMessage((m) => netApi.current(m));
    const offS = net.onStatus((s, d) => {
      if (s === "closed" || s === "error")
        setNetErr(d ?? "The connection dropped.");
    });
    return () => {
      offM();
      offS();
    };
  }, [net]);

  // "auto-play both" toggle (local mode convenience)
  useEffect(() => {
    if (!auto || !game || game.status !== "playing") return;
    const t = setTimeout(botMove, 280);
    return () => clearTimeout(t);
  }, [auto, game, botMove]);

  // vs bot: the opponent (seat 1) moves itself
  useEffect(() => {
    if (
      mode !== "bot" ||
      route !== "play" ||
      !game ||
      game.status !== "playing" ||
      game.current !== 1
    )
      return;
    // a disguised opponent "thinks" for a human-ish, variable beat
    const delay = disguise ? 650 + Math.random() * 1700 : 460;
    const t = setTimeout(botMove, delay);
    return () => clearTimeout(t);
  }, [mode, route, game, botMove, disguise]);

  const [dex, setDex] = useState(false);
  const openDex = useCallback(() => setDex(true), []);

  const goHome = () => {
    if (net) leaveOnline();
    setGame(null);
    setMatch(null);
    recorded.current = null;
    setRoute("home");
  };

  const onConnected = (n: Net, isHost: boolean, rankedMatch = false) => {
    setNet(n);
    setMode("online");
    setRanked(rankedMatch);
    setDisguise(null);
    setMySeat(isHost ? 0 : 1);
    setNetErr(null);
    setGame(null);
    setMatch(null);
    recorded.current = null;
    if (isHost) {
      const seed = (Date.now() >>> 0) || 1;
      setOnlineSeed(seed);
      n.send({ t: "start", seed, ranked: rankedMatch });
      setRoute("draft");
    }
    // guest waits for the "start" message (handled in netApi)
  };

  const enterQueue = (kind: "ranked" | "casual") => {
    setQueueKind(kind);
    setNetErr(null);
    setGame(null);
    setMatch(null);
    recorded.current = null;
    setRoute("queue");
  };
  const queueToBot = () => {
    setMode("bot");
    setBotLevel(queueKind === "ranked" ? "fierce" : "sharp");
    setRanked(queueKind === "ranked");
    setDisguise(randomHandle());
    setGame(null);
    setMatch(null);
    recorded.current = null;
    setRoute("draft");
  };

  let screen: ReactNode;
  if (route === "home") {
    screen = (
      <Home
        profile={profile}
        onLang={(lang) => setProfile((p) => saveProfile({ ...p, lang }))}
        onProfile={() => setRoute("profile")}
        onStart={(m, lvl) => {
          setMode(m);
          setBotLevel(lvl);
          setRanked(false);
          setDisguise(null);
          setGame(null);
          setMatch(null);
          recorded.current = null;
          setRoute("draft");
        }}
        onQueue={enterQueue}
        onOnline={() => setRoute("online")}
        onTutorial={() => setRoute("tutorial")}
        onDex={openDex}
      />
    );
  } else if (route === "queue") {
    screen = (
      <Queue
        kind={queueKind}
        playerName={profile.name}
        canSignIn={account.configured}
        signedIn={account.status === "in"}
        onMatch={(n, host) => onConnected(n, host, queueKind === "ranked")}
        onBot={queueToBot}
        onHome={() => setRoute("home")}
        onAccount={() => setRoute("profile")}
      />
    );
  } else if (route === "online") {
    screen = (
      <Online
        playerName={profile.name}
        onConnected={(n, host) => onConnected(n, host, false)}
        onHome={() => setRoute("home")}
      />
    );
  } else if (route === "profile") {
    screen = (
      <ProfilePage
        profile={profile}
        account={account}
        cloudSynced={cloudSynced}
        onChange={(p) => setProfile(saveProfile(p))}
        onHome={() => setRoute("home")}
      />
    );
  } else if (route === "tutorial") {
    screen = (
      <Tutorial
        onDone={() => {
          setMode("bot");
          setBotLevel("chill");
          setRanked(false);
          setDisguise(null);
          setGame(null);
          setMatch(null);
          recorded.current = null;
          setRoute("draft");
        }}
        onHome={() => setRoute("home")}
        onDex={openDex}
      />
    );
  } else if (route === "draft" || !game || !match) {
    screen = (
      <Draft
        seedCount={seedCount}
        setSeedCount={setSeedCount}
        botSeat={mode === "bot" ? 1 : null}
        online={online}
        onStart={startMatch}
        onOpenDex={openDex}
        onHome={goHome}
      />
    );
  } else {
    screen = (
      <Play
        game={game}
        teams={legLoadouts(match)}
        match={match}
        mode={mode}
        mySeat={mySeat}
        rpDelta={
          match.ranked && game.status === "ended"
            ? (profile.history[0]?.rp ?? null)
            : null
        }
        rp={profile.rp}
        disguised={!!match.disguise}
        peerName={match.disguise ?? net?.peerName() ?? "Opponent"}
        sel={sel}
        setSel={setSel}
        doAction={doAction}
        botMove={botMove}
        auto={auto}
        setAuto={setAuto}
        onOpenDex={openDex}
        onHome={goHome}
        onNextLeg={() =>
          beginLeg({ ...match, leg: 2 }, undefined, match.startEnergy)
        }
        onNewDraft={() => {
          setGame(null);
          setMatch(null);
          recorded.current = null;
          setRoute("draft");
        }}
        onRematch={() => {
          if (mode === "online" && net) {
            const seed = (Date.now() >>> 0) || 1;
            setOnlineSeed(seed);
            net.send({ t: "rematch", seed });
            recorded.current = null;
            setGame(null);
            setMatch(null);
            setRoute("draft");
          } else {
            startMatch(match.draftTeams);
          }
        }}
      />
    );
  }

  return (
    <>
      {screen}
      {dex && <Dex onClose={() => setDex(false)} />}
      {netErr && (
        <div className="dex-overlay" onClick={goHome}>
          <div className="dex" style={{ maxWidth: 380, padding: 20 }}>
            <h2 style={{ marginTop: 0 }}>Match ended</h2>
            <p className="sub">{netErr}</p>
            <button className="primary" onClick={goHome}>
              Back to menu
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================= *
 * Critterdex - every creature and what it does
 * ================================================================= */

function Dex({ onClose }: { onClose: () => void }) {
  return (
    <div className="dex-overlay" onClick={onClose}>
      <div
        className="dex"
        role="dialog"
        aria-label="Critterdex"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dex-head">
          <h2>Critterdex</h2>
          <span className="hint" style={{ margin: 0 }}>
            {ALL_CREATURES.length} critters &middot; six types
          </span>
          <button
            className="dex-close"
            style={{ marginLeft: "auto" }}
            onClick={onClose}
            aria-label="close"
          >
            &times;
          </button>
        </div>
        <div className="dex-body">
          {CAT_ORDER.map((cat) => (
            <section key={cat} className="dex-section">
              <h3 style={{ color: CATEGORIES[cat].hue }}>
                <span
                  className="type-chip"
                  style={{ background: CATEGORIES[cat].hue }}
                >
                  {CATEGORIES[cat].element}
                </span>
                {CATEGORIES[cat].name}
                <span className="dex-tagline">{CATEGORIES[cat].tagline}</span>
              </h3>
              <div className="dex-grid">
                {creaturesByCategory(cat).map((c) => (
                  <div key={c.id} className="dex-card">
                    <Critter id={c.id} size={72} />
                    <div className="dex-info">
                      <div className="dex-name">{c.name}</div>
                      <div className="dex-ep">{c.epithet}</div>
                      <div className="dex-blurb">{c.blurb}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================= *
 * Draft - a wildlife meadow. On your turn a handful of creatures are
 * out in the grass; pick one, or spend a forage token to call a fresh
 * set. Picks are exclusive and alternate in snake order.
 * ================================================================= */

interface OnlineCtx {
  net: Net;
  mySeat: 0 | 1;
  seed: number;
}

function Draft({
  seedCount,
  setSeedCount,
  botSeat,
  online,
  onStart,
  onOpenDex,
  onHome,
}: {
  seedCount: number;
  setSeedCount: (n: number) => void;
  botSeat: 0 | 1 | null;
  online: OnlineCtx | null;
  onStart: (
    t: [CreatureId[], CreatureId[]],
    seeds?: Seed[],
    startEnergy?: [number, number],
  ) => void;
  onOpenDex: () => void;
  onHome: () => void;
}) {
  const order = useMemo(() => snakeOrder(SIZE), []);
  const rng = useRef(makeRng(online ? online.seed : (Date.now() >>> 0) || 1));
  const [picks, setPicks] = useState<[CreatureId[], CreatureId[]]>([[], []]);
  // energy is the SAME resource you spend on abilities in the match:
  // whatever you do not burn on rerolls carries in as your starting energy
  const [energy, setEnergy] = useState<[number, number]>([
    START_ENERGY,
    START_ENERGY,
  ]);
  // one shared pool; a slice of the roster is afloat at any time
  const [meadow, setMeadow] = useState<CreatureId[]>(() =>
    rng.current.shuffle(ALL_CREATURES.slice()).slice(0, MEADOW_SIZE),
  );
  const undoStack = useRef<
    Array<{ meadow: CreatureId[]; energy: [number, number] }>
  >([]);
  const [stage, setStage] = useState<"pick" | "assign">("pick");
  const [assigned, setAssigned] = useState<[CreatureId[], CreatureId[]]>([
    [],
    [],
  ]);
  const [oppTeam, setOppTeam] = useState<CreatureId[] | null>(null);
  const [oppEnergy, setOppEnergy] = useState<number>(START_ENERGY);
  const [iReady, setIReady] = useState(false);

  const step = picks[0].length + picks[1].length;
  const done = step >= order.length;
  const current = order[step] ?? 0;
  const myTurn = !online || current === online.mySeat;

  // roster still in the wild: not drafted, not currently out in the meadow
  const wild = useMemo(() => {
    const used = new Set<CreatureId>([...picks[0], ...picks[1], ...meadow]);
    return ALL_CREATURES.filter((id) => !used.has(id));
  }, [picks, meadow]);

  const toAssign = (p: [CreatureId[], CreatureId[]]) => {
    setAssigned([p[0].slice(), p[1].slice()]);
    setStage("assign");
  };

  const pick = (id: CreatureId, fromNet = false) => {
    if (stage !== "pick" || done || !meadow.includes(id)) return;
    if (online && !fromNet && current !== online.mySeat) return;
    undoStack.current.push({
      meadow: meadow.slice(),
      energy: [energy[0], energy[1]],
    });
    const next: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    next[current].push(id);
    // the grass fills back in behind the one you took
    const refill = wild.length ? rng.current.pick(wild) : null;
    setMeadow(meadow.flatMap((m) => (m === id ? (refill ? [refill] : []) : [m])));
    setPicks(next);
    if (online && !fromNet) online.net.send({ t: "pick", id });
    if (next[0].length + next[1].length === order.length) toAssign(next);
  };

  const reroll = (fromNet = false) => {
    if (done || energy[current] < REROLL_COST) return;
    if (online && !fromNet && current !== online.mySeat) return;
    // whole pool slips under; a fresh set surfaces from the wild pile
    const fresh = rng.current.shuffle(wild.slice()).slice(0, MEADOW_SIZE);
    if (fresh.length < MEADOW_SIZE) {
      fresh.push(
        ...rng.current
          .shuffle(meadow.slice())
          .slice(0, MEADOW_SIZE - fresh.length),
      );
    }
    const e: [number, number] = [energy[0], energy[1]];
    e[current] -= REROLL_COST;
    setEnergy(e);
    setMeadow(fresh);
    if (online && !fromNet) online.net.send({ t: "reroll" });
  };

  const autoRest = () => {
    const next: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    const taken = new Set<CreatureId>([...next[0], ...next[1]]);
    let s = taken.size;
    while (s < order.length) {
      const choice = rng.current.pick(ALL_CREATURES.filter((c) => !taken.has(c)));
      taken.add(choice);
      next[order[s]].push(choice);
      s++;
    }
    setPicks(next);
    toAssign(next);
  };

  /** global draft step at which seat p made its i-th pick */
  const stepOfPick = (p: 0 | 1, i: number): number | null => {
    let seen = 0;
    for (let s = 0; s < order.length; s++) {
      if (order[s] === p) {
        if (seen === i) return s;
        seen++;
      }
    }
    return null;
  };

  /** click a critter in your line-up to send it (and anything picked after
   *  it) back to the pool */
  const returnPick = (p: 0 | 1, i: number) => {
    if (online) return; // return-to-pool is disabled online
    if (stage !== "pick" || done || !picks[p][i]) return;
    const target = stepOfPick(p, i);
    if (target == null || target >= step) return;
    const np: [CreatureId[], CreatureId[]] = [picks[0].slice(), picks[1].slice()];
    let m = meadow;
    let e: [number, number] = [energy[0], energy[1]];
    while (np[0].length + np[1].length > target) {
      const s = np[0].length + np[1].length - 1;
      np[order[s]].pop();
      const snap = undoStack.current.pop();
      if (snap) {
        m = snap.meadow;
        e = snap.energy;
      }
    }
    setPicks(np);
    setMeadow(m);
    setEnergy(e);
  };

  // vs bot: the opponent seat drafts itself
  useEffect(() => {
    if (botSeat == null || done || stage !== "pick" || current !== botSeat) {
      return;
    }
    const tmr = setTimeout(() => {
      if (meadow.length) pick(rng.current.pick(meadow));
    }, 520);
    return () => clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botSeat, current, done, stage, meadow]);

  // online: apply the opponent's draft actions as they arrive
  const draftApi = useRef({ pick, reroll });
  draftApi.current = { pick, reroll };
  const [oppSeeds, setOppSeeds] = useState<Seed[] | null>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    if (!online) return;
    return online.net.onMessage((m) => {
      if (m.t === "pick") draftApi.current.pick(m.id, true);
      else if (m.t === "reroll") draftApi.current.reroll(true);
      else if (m.t === "ready") {
        setOppTeam(m.team);
        setOppEnergy(m.energy);
      } else if (m.t === "seeds") setOppSeeds(m.seeds);
    });
  }, [online]);

  // online: once both players are ready, start the match in lockstep
  useEffect(() => {
    if (!online || stage !== "assign" || !iReady || !oppTeam || startedRef.current)
      return;
    const myTeam = assigned[online.mySeat];
    const myE = energy[online.mySeat];
    if (online.mySeat === 0) {
      const seeds = generateSeeds(
        { size: SIZE, box: { rows: 3, cols: 3 } },
        seedCount,
        rng.current,
      );
      startedRef.current = true;
      online.net.send({ t: "seeds", seeds });
      onStart([myTeam, oppTeam], seeds, [myE, oppEnergy]);
    } else if (oppSeeds) {
      startedRef.current = true;
      onStart([oppTeam, myTeam], oppSeeds, [oppEnergy, myE]);
    }
  }, [
    online,
    stage,
    iReady,
    oppTeam,
    oppEnergy,
    oppSeeds,
    assigned,
    energy,
    seedCount,
    onStart,
  ]);

  const readyUp = () => {
    if (!online) return;
    setIReady(true);
    online.net.send({
      t: "ready",
      team: assigned[online.mySeat].slice(),
      energy: energy[online.mySeat],
    });
  };

  if (stage === "assign") {
    const seats: Array<0 | 1> = online ? [online.mySeat] : [0, 1];
    return (
      <div className="app">
        <div className="appbar">
          <h1>CRITTDOKU</h1>
          <span className="status">
            {online && iReady
              ? oppTeam
                ? "starting..."
                : `waiting for ${online.net.peerName()}...`
              : `line-up set · bringing ${energy[online ? online.mySeat : 0]}⚡ into the match`}
          </span>
          <div className="controls" style={{ marginLeft: "auto" }}>
            {!online && (
              <label>
                seeds
                <select
                  value={seedCount}
                  onChange={(e) => setSeedCount(Number(e.target.value))}
                >
                  {[0, 1, 3, 6, 10, 16].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button onClick={onHome}>Menu</button>
            <button onClick={onOpenDex}>Critterdex</button>
            {online ? (
              <button
                className="primary"
                onClick={readyUp}
                disabled={iReady}
              >
                {iReady ? "ready" : "Ready"}
              </button>
            ) : (
              <button
                className="primary"
                onClick={() => onStart(assigned, undefined, [energy[0], energy[1]])}
              >
                Start match
              </button>
            )}
          </div>
        </div>
        <main className="stage assign">
          {seats.map((p) => (
            <div key={p} className="panel">
              <div className="turn">
                <span className={`dot p${p}`} />{" "}
                {online ? "Your team" : NAMES[p]}
              </div>
              {Array.from({ length: SIZE }, (_, i) => {
                const digit = i + 1;
                const id = assigned[p][i];
                return (
                  <div key={digit} className="slot">
                    <span className="slot-d">{digit}</span>
                    <Critter id={id} size={30} />
                    <span className="slot-name">{ROSTER[id].name}</span>
                    <span
                      className="type-chip sm"
                      style={{
                        background: CATEGORIES[ROSTER[id].category].hue,
                      }}
                    >
                      {CATEGORIES[ROSTER[id].category].element}
                    </span>
                    <span className="slot-blurb">{ROSTER[id].blurb}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="appbar">
        <h1>CRITTDOKU</h1>
        <span className="status">
          <span className={`dot p${current}`} />
          {online
            ? myTurn
              ? "Your pick"
              : `${online.net.peerName()} is picking`
            : botSeat != null
              ? current === botSeat
                ? "Bot drafts"
                : "Your pick"
              : `${NAMES[current]} drafts`}{" "}
          &middot; {step}/{order.length}
        </span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button onClick={onHome}>Menu</button>
          <button onClick={onOpenDex}>Critterdex</button>
          {!online && <button onClick={autoRest}>Random</button>}
        </div>
      </div>

      <div className="draftstrip">
        {([0, 1] as const).map((p) => {
          const mine = !online && (botSeat == null || p !== botSeat);
          return (
            <div
              key={p}
              className={`tray-side ${current === p && !done ? "now" : ""}`}
            >
              <span className={`dot p${p}`} />
              <div className="tray-slots">
                {Array.from({ length: SIZE }, (_, i) => {
                  const id = picks[p][i];
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`tray-slot ${id ? "filled" : ""} ${
                        id && mine ? "removable" : ""
                      }`}
                      title={
                        id
                          ? mine
                            ? `${ROSTER[id].name} — tap to send back`
                            : ROSTER[id].name
                          : ""
                      }
                      disabled={!id || !mine}
                      onClick={() => returnPick(p, i)}
                    >
                      {id && <Critter id={id} size={22} />}
                      {id && <span className="ts-d">{i + 1}</span>}
                    </button>
                  );
                })}
              </div>
              <span className="forage-count" title="energy left (carries into the match)">
                {energy[p]}⚡
              </span>
            </div>
          );
        })}
      </div>

      <main className="stage meadow-stage">
        {done ? (
          <div className="meadow">
            <div className="meadow-tag" style={{ background: "var(--ink)" }}>
              teams are set
            </div>
          </div>
        ) : (
          <MeadowScene
            options={meadow}
            onPick={pick}
            onReroll={() => reroll()}
            rerollCost={REROLL_COST}
            energyLeft={energy[current]}
            disabled={
              done ||
              (botSeat != null && current === botSeat) ||
              (online != null && !myTurn)
            }
            ownerName={
              online
                ? myTurn
                  ? "You"
                  : online.net.peerName()
                : botSeat != null
                  ? current === botSeat
                    ? "Bot"
                    : "You"
                  : NAMES[current]
            }
            tint={current === 0 ? "var(--p0)" : "var(--p1)"}
          />
        )}
      </main>
    </div>
  );
}

/* ================================================================= *
 * Play
 * ================================================================= */

function Play({
  game,
  teams,
  match,
  mode,
  mySeat,
  rpDelta,
  rp,
  disguised,
  peerName,
  sel,
  setSel,
  doAction,
  botMove,
  auto,
  setAuto,
  onOpenDex,
  onHome,
  onNextLeg,
  onNewDraft,
  onRematch,
}: {
  game: GameState;
  teams: [CreatureId[], CreatureId[]];
  match: Match;
  mode: Mode;
  mySeat: 0 | 1;
  rpDelta: number | null;
  rp: number;
  disguised: boolean;
  peerName: string;
  sel: number | null;
  setSel: (n: number | null) => void;
  doAction: (a: Action) => void;
  botMove: () => void;
  auto: boolean;
  setAuto: (f: (a: boolean) => boolean) => void;
  onOpenDex: () => void;
  onHome: () => void;
  onNextLeg: () => void;
  onNewDraft: () => void;
  onRematch: () => void;
}) {
  // a disguised bot presents exactly like an online opponent
  const asOpponent = mode === "online" || disguised;
  const vsBot = mode === "bot" && !disguised;
  const isOnline = mode === "online";
  const myTurn = !isOnline || game.current === mySeat;
  const box = game.config.box;
  // aggregate match score (seat 0 / seat 1) across finished legs
  const agg: [number, number] = [0, 0];
  for (const ls of match.legScores) {
    if (ls) {
      agg[0] += ls[0];
      agg[1] += ls[1];
    }
  }
  const legOneOver =
    match.bestOf === 2 && match.leg === 1 && game.status === "ended";
  const live = projectedScore(game);
  const lastCell = lastTouchedCell(game);
  const playing = game.status === "playing";
  const cur = game.current;

  const legalNow = useMemo(
    () => (playing && myTurn ? legalActions(game) : []),
    [game, playing, myTurn],
  );
  const actionCells = useMemo(() => {
    const s = new Set<number>();
    for (const a of legalNow)
      if (a.type === "place" || a.type === "mine") s.add(a.cell);
    return s;
  }, [legalNow]);

  const selActions = useMemo(() => {
    if (sel === null || !playing) return [] as Action[];
    return legalActions(game).filter((a) =>
      a.type === "move" ? a.from === sel : a.cell === sel,
    );
  }, [sel, game, playing]);

  const cellTint = useMemo(() => {
    const out: string[] = [];
    for (let cell = 0; cell < SIZE * SIZE; cell++) {
      let claim = 0;
      let lead = 0;
      for (let k = 0; k < 3; k++) {
        const region = game.regions[game.cellRegions[cell * 3 + k]];
        if (region.claimedBy === 0) claim |= 1;
        else if (region.claimedBy === 1) claim |= 2;
        const h = territoryHolder(game, region);
        if (h === 0) lead |= 1;
        else if (h === 1) lead |= 2;
      }
      const m = claim || lead;
      out.push(
        (m === 1 ? "t0" : m === 2 ? "t1" : m === 3 ? "t01" : "") +
          (claim && m ? " tstrong" : ""),
      );
    }
    return out;
  }, [game]);

  const creatureLabel = (cell: number) => {
    const d = game.grid[cell];
    const p = game.placedBy[cell];
    if (d === 0 || p < 0) return "";
    return `${ROSTER[teams[p][d - 1]].name} · ${d}`;
  };

  const lockedCounts: [number, number] = [0, 0];
  for (const rg of game.regions)
    if (rg.claimedBy === 0 || rg.claimedBy === 1) lockedCounts[rg.claimedBy]++;

  // a bold frame in the owner's colour around every locked region
  const lockFrame = useMemo(() => {
    const col = (o: number) => (o === 0 ? "#15803d" : "#e11d48");
    const out: (CSSProperties | undefined)[] = [];
    for (let cell = 0; cell < SIZE * SIZE; cell++) {
      const r = Math.floor(cell / SIZE);
      const c = cell % SIZE;
      const side: { t?: number; b?: number; l?: number; r?: number } = {};
      for (let k = 0; k < 3; k++) {
        const rg = game.regions[game.cellRegions[cell * 3 + k]];
        if (rg.claimedBy !== 0 && rg.claimedBy !== 1) continue;
        const o = rg.claimedBy;
        if (rg.kind === "row") {
          side.t = o;
          side.b = o;
          if (c === 0) side.l = o;
          if (c === SIZE - 1) side.r = o;
        } else if (rg.kind === "col") {
          side.l = o;
          side.r = o;
          if (r === 0) side.t = o;
          if (r === SIZE - 1) side.b = o;
        } else {
          if (r % box.rows === 0) side.t = o;
          if (r % box.rows === box.rows - 1) side.b = o;
          if (c % box.cols === 0) side.l = o;
          if (c % box.cols === box.cols - 1) side.r = o;
        }
      }
      const sh: string[] = [];
      if (side.t != null) sh.push(`inset 0 4px 0 0 ${col(side.t)}`);
      if (side.b != null) sh.push(`inset 0 -4px 0 0 ${col(side.b)}`);
      if (side.l != null) sh.push(`inset 4px 0 0 0 ${col(side.l)}`);
      if (side.r != null) sh.push(`inset -4px 0 0 0 ${col(side.r)}`);
      out.push(sh.length ? { boxShadow: sh.join(",") } : undefined);
    }
    return out;
  }, [game, box.rows, box.cols]);

  const who = (seat: 0 | 1) =>
    asOpponent
      ? seat === mySeat
        ? "You"
        : peerName
      : vsBot
        ? seat === 0
          ? "You"
          : "Bot"
        : NAMES[seat];
  const matchLine =
    game.status !== "playing"
      ? legOneOver
        ? `Leg 1 done ${game.score[0]}–${game.score[1]}`
        : `${agg[0] === agg[1] ? "Level" : who((agg[0] > agg[1] ? 0 : 1) as 0 | 1) + " win"}${agg[0] === agg[1] ? "" : "s"} ${Math.max(agg[0], agg[1])}–${Math.min(agg[0], agg[1])}`
      : vsBot || asOpponent
        ? `${who(cur as 0 | 1)} to move`
        : `Leg ${match.leg}/2 · ${NAMES[cur]} to move${
            match.legScores[0] ? ` · match ${agg[0]}–${agg[1]}` : ""
          }`;

  return (
    <div className="app">
      <div className="appbar">
        <h1>CRITTDOKU</h1>
        {match.ranked && <span className="ranked-tag">RANKED</span>}
        <span className="status">
          <span className={`dot p${cur}`} />
          {matchLine}
          {vsBot && playing && cur === 1 && (
            <span className="thinking"> · thinking</span>
          )}
          {asOpponent && playing && game.current !== mySeat && (
            <span className="thinking"> · their turn</span>
          )}
          {!playing && rpDelta != null && (
            <span className={`rp-note ${rpDelta >= 0 ? "up" : "down"}`}>
              {rpDelta >= 0 ? "+" : ""}
              {rpDelta} RP &middot; {rp} total
            </span>
          )}
        </span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          {!vsBot && !asOpponent && (
            <>
              <button onClick={botMove} disabled={!playing}>
                Bot move
              </button>
              <button onClick={() => setAuto((x) => !x)} disabled={!playing}>
                {auto ? "Stop" : "Auto-play"}
              </button>
            </>
          )}
          <button onClick={onHome}>Menu</button>
          <button onClick={onOpenDex}>Critterdex</button>
          {!asOpponent && <button onClick={onNewDraft}>New draft</button>}
          {(!isOnline || mySeat === 0) && (
            <button onClick={onRematch} disabled={playing}>
              {asOpponent ? "Play again" : "Rematch"}
            </button>
          )}
          {isOnline && mySeat === 1 && !playing && (
            <span className="hint" style={{ margin: 0 }}>
              waiting for host...
            </span>
          )}
        </div>
      </div>

      <main className="stage play">
        <div className="board-col">
        <div className="board">
          {Array.from({ length: SIZE * SIZE }, (_, cell) => {
            const r = Math.floor(cell / SIZE);
            const c = cell % SIZE;
            const v = game.grid[cell];
            const owner = game.placedBy[cell];
            const mineOwner = game.mines[cell];
            const actionable = actionCells.has(cell);
            const selectable =
              playing &&
              myTurn &&
              (mineOwner !== -1 || v === 0 || owner === cur || actionable);
            const legalHere = playing && myTurn && v === 0 && actionable;
            const cls = [
              "cell",
              game.seeded[cell] ? "seeded" : "",
              game.dormant[cell] ? "dormant" : "",
              mineOwner !== -1 ? `mine mine${mineOwner}` : "",
              sel === cell ? "sel" : "",
              legalHere && sel === null ? "legal" : "",
              cellTint[cell],
              (c + 1) % box.cols === 0 && c < SIZE - 1 ? "box-r" : "",
              (r + 1) % box.rows === 0 && r < SIZE - 1 ? "box-b" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={cell}
                className={cls}
                style={lockFrame[cell]}
                title={creatureLabel(cell)}
                disabled={!selectable}
                onClick={() => setSel(sel === cell ? null : cell)}
              >
                {v !== 0 ? v : mineOwner !== -1 ? "◆" : ""}
                {cell === lastCell && <span className="just-placed" />}
              </button>
            );
          })}
        </div>
        </div>

        <div className="info-col">
          <div className="panel">
            {legOneOver && (
              <div className="banner" style={{ marginBottom: 10 }}>
                Leg 1: Sage {game.score[0]}, Clay {game.score[1]}. Teams swap
                for leg 2.{" "}
                <button
                  className="primary"
                  style={{ marginLeft: 6 }}
                  onClick={onNextLeg}
                >
                  Play leg 2
                </button>
              </div>
            )}
            {!playing && !legOneOver && (
              <div className="banner" style={{ marginBottom: 10 }}>
                {agg[0] === agg[1]
                  ? vsBot
                    ? "Dead level."
                    : "The match is level."
                  : `${who((agg[0] > agg[1] ? 0 : 1) as 0 | 1)} ${
                      vsBot && agg[0] < agg[1] ? "won" : "takes it"
                    }, ${Math.max(agg[0], agg[1])}–${Math.min(agg[0], agg[1])}.`}
              </div>
            )}
            {playing && game.pendingExtra && (
              <div className="banner" style={{ marginBottom: 10 }}>
                {who(cur as 0 | 1)}: place your burst digit.
              </div>
            )}

            <div className="scores">
              <div className="s">
                <span className="dot p0" /> {who(0)}{" "}
                <b key={`s0-${playing ? live[0] : game.score[0]}`}>
                  {playing ? live[0] : game.score[0]}
                </b>
              </div>
              <div className="s">
                <span className="dot p1" /> {who(1)}{" "}
                <b key={`s1-${playing ? live[1] : game.score[1]}`}>
                  {playing ? live[1] : game.score[1]}
                </b>
              </div>
              <div className="s" style={{ alignSelf: "center" }}>
                of {game.regions.length}
              </div>
            </div>
            <div className="hint" style={{ marginTop: 4 }}>
              {playing ? "regions if play froze now" : "final"} · energy{" "}
              {game.energy[0]} / {game.energy[1]}
            </div>
            <div className="abilities">
              {([0, 1] as const).map((p) => {
                const list = teamAbilities(game, p);
                return (
                  <div key={p} className="ab-row">
                    <span className={`dot p${p}`} />
                    {list.length === 0 && (
                      <span className="hint" style={{ margin: 0 }}>
                        no abilities
                      </span>
                    )}
                    {list.map((ab) => (
                      <span
                        key={ab.name}
                        className={`chip ${
                          game.energy[p] >= ab.cost ? "on" : "off"
                        }`}
                        title={ab.help}
                      >
                        {ab.label} {ab.cost}⚡
                      </span>
                    ))}
                    {game.mines.some((m) => m === p) && (
                      <span className="chip mine-chip">
                        {game.mines.filter((m) => m === p).length} mines
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {sel !== null && playing && (
              <div className="picker-wrap">
                <div className="hint" style={{ marginTop: 0 }}>
                  {game.mines[sel] !== -1
                    ? `A mine (${who(game.mines[sel] as 0 | 1)})`
                    : game.grid[sel] === 0
                      ? "Pick a digit for this cell"
                      : creatureLabel(sel)}
                </div>
                <div className="picker">
                  {selActions.length === 0 && (
                    <span className="hint">nothing legal here</span>
                  )}
                  {selActions.map((a, i) => (
                    <button key={i} onClick={() => doAction(a)} title={actionHelp(a)}>
                      {actionLabel(a)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {([0, 1] as const).map((p) => (
            <div key={p} className="panel team">
              <div className="team-head">
                <span className={`dot p${p}`} /> {who(p)}
                <span className="team-locked">
                  locked <b>{lockedCounts[p]}</b>
                </span>
              </div>
              <div className="team-cards">
                {teams[p].map((id, i) => {
                  const def = ROSTER[id];
                  return (
                    <div key={i} className="tcard" title={def.blurb}>
                      <span className="tc-d">{i + 1}</span>
                      <Critter id={id} size={40} />
                      <span className="tc-body">
                        <span className="tc-name">{def.name}</span>
                        <span
                          className="type-chip sm"
                          style={{
                            background: CATEGORIES[def.category].hue,
                          }}
                        >
                          {CATEGORIES[def.category].element}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
