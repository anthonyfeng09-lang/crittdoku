import Peer, { type DataConnection } from "peerjs";
import type { Action, CreatureId, Seed } from "../engine";

/* Peer-to-peer link for a 1v1 online match. WebRTC data channel brokered by
 * the free public PeerServer cloud, so there is nothing to deploy. The host
 * picks a short room code; the guest types it in. Turn-based, so the plain
 * reliable data channel is all we need. */

export type NetMsg =
  | { t: "hello"; name: string }
  | { t: "start"; seed: number } // host -> guest: begin the draft
  | { t: "pick"; id: CreatureId } // the drafter on turn -> the other
  | { t: "reroll" }
  | { t: "ready"; team: CreatureId[]; energy: number } // digit-ordered team + energy left
  | { t: "seeds"; seeds: Seed[] } // host -> guest: begin the match
  | { t: "move"; action: Action } // the player on turn -> the other
  | { t: "rematch"; seed: number }
  | { t: "bye" };

export type NetStatus =
  | "starting"
  | "waiting" // host has a code, no guest yet
  | "connected"
  | "closed"
  | "error";

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
const PREFIX = "dendoku-v1-";

function randCode(n = 4): string {
  let s = "";
  for (let i = 0; i < n; i++)
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

interface Guts {
  peer: Peer | null;
  conn: DataConnection | null;
  status: NetStatus;
  detail?: string;
  outbox: NetMsg[];
  inbox: NetMsg[]; // messages that arrived before anyone was listening
  msgSubs: Set<(m: NetMsg) => void>;
  statSubs: Set<(s: NetStatus, d?: string) => void>;
  peerName: string;
  closed: boolean;
}

function makeNet(code: string, isHost: boolean): Net {
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
        peer.on("connection", (conn) => wireConn(conn));
      } else {
        const conn = peer.connect(PREFIX + code, { reliable: true });
        setStatus("starting", "Reaching the room...");
        wireConn(conn);
      }
    });

    peer.on("error", (err) => {
      const type = (err as unknown as { type?: string }).type;
      if (isHost && type === "unavailable-id" && attempt < 4) {
        // code collision on the broker: try a fresh one
        const next = randCode();
        (net as { code: string }).code = next;
        peer.destroy();
        startPeer(PREFIX + next, attempt + 1);
        return;
      }
      if (!g.closed) {
        setStatus(
          "error",
          type === "peer-unavailable"
            ? "No room with that code. Check it and try again."
            : type === "network" || type === "server-error"
              ? "Could not reach the matchmaking server."
              : "Something went wrong connecting.",
        );
      }
    });

    peer.on("disconnected", () => {
      if (!g.closed) peer.reconnect();
    });
  };

  startPeer(isHost ? PREFIX + code : undefined);

  const net: Net = {
    code,
    isHost,
    send(msg) {
      if (g.conn && g.conn.open) g.conn.send(msg);
      else g.outbox.push(msg);
    },
    onMessage(cb) {
      g.msgSubs.add(cb);
      if (g.inbox.length) {
        const pending = g.inbox.splice(0);
        for (const m of pending) cb(m);
      }
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
