import Peer, { type DataConnection } from "peerjs";
import type { Action, CreatureId, Seed } from "../engine";

/* Peer-to-peer link for a 1v1 online match. WebRTC data channel brokered by
 * the free public PeerServer cloud, so there is nothing to deploy.
 *
 * Two ways in:
 *  - hostRoom / joinRoom: private match by a short shared room code.
 *  - joinQueue: a public "ranked" / "casual" queue. The first player to a
 *    queue claims a fixed rendezvous id and waits; the next connects to it.
 *    If nobody shows within the timeout the caller falls back to a bot.
 *    (Only one pair can form per queue at a time - fine at this scale.)
 */

export type NetMsg =
  | { t: "hello"; name: string }
  | { t: "start"; seed: number; ranked?: boolean } // host -> guest: begin the draft
  | { t: "pick"; id: CreatureId } // the drafter on turn -> the other
  | { t: "reroll" }
  | { t: "ready"; team: CreatureId[]; energy: number } // digit-ordered team + energy left
  | { t: "seeds"; seeds: Seed[] } // host -> guest: begin the match
  | { t: "move"; action: Action } // the player on turn -> the other
  | { t: "rematch"; seed: number }
  | { t: "bye" };

export type NetStatus = "starting" | "waiting" | "connected" | "closed" | "error";

export interface Net {
  code: string;
  isHost: boolean;
  send(msg: NetMsg): void;
  onMessage(cb: (m: NetMsg) => void): () => void;
  onStatus(cb: (s: NetStatus, detail?: string) => void): () => void;
  status(): NetStatus;
  peerName(): string;
  close(): void;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const PREFIX = "crittdoku-v1-";

function randCode(n = 4): string {
  let s = "";
  for (let i = 0; i < n; i++)
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

interface Opts {
  /** use `id` verbatim as the peer id (queue rendezvous) instead of PREFIX+code */
  rawId?: boolean;
  /** don't retry with a fresh code on a host id-collision - report "error" */
  noRetry?: boolean;
}

interface Guts {
  peer: Peer | null;
  conn: DataConnection | null;
  status: NetStatus;
  detail?: string;
  outbox: NetMsg[];
  inbox: NetMsg[];
  msgSubs: Set<(m: NetMsg) => void>;
  statSubs: Set<(s: NetStatus, d?: string) => void>;
  peerName: string;
  closed: boolean;
}

function makeNet(code: string, isHost: boolean, opts: Opts = {}): Net {
  const g: Guts = {
    peer: null,
    conn: null,
    status: "starting",
    outbox: [],
    inbox: [],
    msgSubs: new Set(),
    statSubs: new Set(),
    peerName: "Opponent",
    closed: false,
  };
  const idFor = (c: string) => (opts.rawId ? c : PREFIX + c);

  const setStatus = (s: NetStatus, d?: string) => {
    g.status = s;
    g.detail = d;
    for (const cb of g.statSubs) cb(s, d);
  };
  const deliver = (m: NetMsg) => {
    if (m.t === "hello") g.peerName = m.name || "Opponent";
    if (g.msgSubs.size === 0) {
      g.inbox.push(m);
      return;
    }
    for (const cb of g.msgSubs) cb(m);
  };
  const flush = () => {
    if (!g.conn || !g.conn.open) return;
    for (const m of g.outbox.splice(0)) g.conn.send(m);
  };
  const wireConn = (conn: DataConnection) => {
    if (g.conn) {
      // already matched: politely refuse extra dials
      try {
        conn.close();
      } catch {
        /* ignore */
      }
      return;
    }
    g.conn = conn;
    conn.on("open", () => {
      setStatus("connected");
      flush();
    });
    conn.on("data", (d) => deliver(d as NetMsg));
    conn.on("close", () => {
      if (!g.closed) setStatus("closed", "The connection dropped.");
    });
    conn.on("error", () => {
      if (!g.closed) setStatus("error", "Connection error.");
    });
  };

  const startPeer = (id: string | undefined, attempt = 0) => {
    const peer = new Peer(id as string, { debug: 1 });
    g.peer = peer;

    peer.on("open", () => {
      if (isHost) {
        setStatus("waiting");
        peer.on("connection", wireConn);
      } else {
        setStatus("starting", "Reaching the room...");
        wireConn(peer.connect(idFor(code), { reliable: true }));
      }
    });

    peer.on("error", (err) => {
      const type = (err as unknown as { type?: string }).type;
      if (isHost && type === "unavailable-id") {
        if (opts.noRetry) {
          if (!g.closed) setStatus("error", "id-taken");
          return;
        }
        if (attempt < 4) {
          const next = randCode();
          (net as { code: string }).code = next;
          peer.destroy();
          startPeer(idFor(next), attempt + 1);
          return;
        }
      }
      if (!g.closed)
        setStatus(
          "error",
          type === "peer-unavailable"
            ? "No room with that code. Check it and try again."
            : type === "network" || type === "server-error"
              ? "Could not reach the matchmaking server."
              : "Something went wrong connecting.",
        );
    });

    peer.on("disconnected", () => {
      if (!g.closed) peer.reconnect();
    });
  };

  startPeer(isHost ? idFor(code) : undefined);

  const net: Net = {
    code,
    isHost,
    send(msg) {
      if (g.conn && g.conn.open) g.conn.send(msg);
      else g.outbox.push(msg);
    },
    onMessage(cb) {
      g.msgSubs.add(cb);
      if (g.inbox.length) for (const m of g.inbox.splice(0)) cb(m);
      return () => g.msgSubs.delete(cb);
    },
    onStatus(cb) {
      g.statSubs.add(cb);
      cb(g.status, g.detail);
      return () => g.statSubs.delete(cb);
    },
    status: () => g.status,
    peerName: () => g.peerName,
    close() {
      g.closed = true;
      try {
        if (g.conn && g.conn.open) g.conn.send({ t: "bye" });
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        g.conn?.close();
        g.peer?.destroy();
      }, 60);
      setStatus("closed");
    },
  };
  return net;
}

export function hostRoom(): Net {
  return makeNet(randCode(), true);
}

export function joinRoom(code: string): Net {
  return makeNet(code.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""), false);
}

/** enter a public queue; matched -> onMatch, timed out -> onGiveUp */
export function joinQueue(
  kind: "ranked" | "casual",
  playerName: string,
  onMatch: (net: Net, isHost: boolean) => void,
  onGiveUp: () => void,
  timeoutMs = 16000,
): { cancel: () => void } {
  const qid = `queue-${kind}`;
  let done = false;
  let current: Net | null = null;
  let offStatus: (() => void) | null = null;
  let offMsg: (() => void) | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let handshake: ReturnType<typeof setTimeout> | undefined;

  // A data channel "connected" on a shared public rendezvous can be a ghost -
  // the free broker keeps a dead id routable for minutes after a peer drops.
  // Only commit once we've actually heard a "hello" back from a live partner.
  const confirmMatch = (net: Net, host: boolean) => {
    if (done) {
      net.close();
      return;
    }
    net.send({ t: "hello", name: playerName });
    offMsg = net.onMessage((m) => {
      if (done || m.t !== "hello") return;
      done = true;
      clearTimeout(timer);
      clearTimeout(retry);
      clearTimeout(handshake);
      offStatus?.();
      offMsg?.();
      onMatch(net, host);
    });
    clearTimeout(handshake);
    handshake = setTimeout(() => {
      if (done) return;
      offMsg?.();
      retry = setTimeout(() => cycle(true), 300);
    }, 4000);
  };
  // Only the timeout (or an explicit cancel) ends the wait. Broker hiccups and
  // a peer that grabbed-then-left the rendezvous just bounce us back to trying;
  // the queue is meant to sit for the full 20-30s before falling to a bot.
  const giveUp = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    clearTimeout(retry);
    clearTimeout(handshake);
    offStatus?.();
    offMsg?.();
    current?.close();
    onGiveUp();
  };

  const cycle = (asHost: boolean) => {
    if (done) return;
    offStatus?.();
    offMsg?.();
    clearTimeout(handshake);
    current?.close();
    current = makeNet(qid, asHost, { rawId: true, noRetry: true });
    offStatus = current.onStatus((s, d) => {
      if (done) return;
      if (s === "connected") {
        confirmMatch(current as Net, asHost);
      } else if (s === "error" && d === "id-taken") {
        // someone is already hosting - go be their guest
        clearTimeout(retry);
        retry = setTimeout(() => cycle(false), 200);
      } else if (s === "error" || s === "closed") {
        // broker/guest hiccup - wait a beat and try hosting again
        clearTimeout(retry);
        retry = setTimeout(() => cycle(true), 1500);
      }
    });
  };

  cycle(true);

  const timer = setTimeout(giveUp, timeoutMs);
  return {
    cancel: () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      clearTimeout(retry);
      clearTimeout(handshake);
      offStatus?.();
      offMsg?.();
      current?.close();
    },
  };
}
