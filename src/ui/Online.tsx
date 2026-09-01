import { useEffect, useRef, useState } from "react";
import { hostRoom, joinRoom, type Net, type NetStatus } from "../net/peer";

/* The online lobby: host a room and share the code, or join with one. Once the
 * data channel is open this hands the live Net up to App, which drives the
 * synced draft and match. */

export function Online({
  playerName,
  onConnected,
  onHome,
}: {
  playerName: string;
  onConnected: (net: Net, isHost: boolean) => void;
  onHome: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "host" | "join">("choose");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<NetStatus>("starting");
  const [detail, setDetail] = useState<string>("");
  const [roomCode, setRoomCode] = useState("");
  const [copied, setCopied] = useState(false);
  const netRef = useRef<Net | null>(null);

  // tear down a half-open connection if the user backs out
  const drop = () => {
    netRef.current?.close();
    netRef.current = null;
  };
  useEffect(() => () => drop(), []);

  const attach = (net: Net) => {
    netRef.current = net;
    net.send({ t: "hello", name: playerName });
    const offS = net.onStatus((s, d) => {
      setStatus(s);
      setDetail(d ?? "");
      setRoomCode(net.code);
      if (s === "connected") {
        offS();
        netRef.current = null; // hand it off, don't close on unmount
        onConnected(net, net.isHost);
      }
    });
  };

  const startHost = () => {
    setMode("host");
    setStatus("starting");
    attach(hostRoom());
  };
  const startJoin = () => {
    if (code.trim().length < 4) return;
    setMode("join");
    setStatus("starting");
    attach(joinRoom(code));
  };

  return (
    <div className="app">
      <div className="appbar">
        <h1>CRITTDOKU</h1>
        <span className="status">Play online</span>
        <div className="controls" style={{ marginLeft: "auto" }}>
          <button
            onClick={() => {
              drop();
              onHome();
            }}
          >
            Menu
          </button>
        </div>
      </div>

      <main className="stage online">
        <div className="online-card">
          {mode === "choose" && (
            <>
              <h2>Play a friend</h2>
              <p className="sub">
                One of you hosts and reads out the code. Peer to peer, no
                account. Best with both of you on decent wifi.
              </p>
              <button className="big-btn" onClick={startHost}>
                Host a room
              </button>
              <div className="online-or">or</div>
              <div className="join-row">
                <input
                  placeholder="ROOM CODE"
                  value={code}
                  maxLength={5}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  onKeyDown={(e) => e.key === "Enter" && startJoin()}
                />
                <button
                  className="big-btn"
                  onClick={startJoin}
                  disabled={code.trim().length < 4}
                >
                  Join
                </button>
              </div>
            </>
          )}

          {mode === "host" && (
            <>
              <h2>Room code</h2>
              <div className="room-code">
                {(roomCode || "----").split("").map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </div>
              <button
                className="big-btn ghost"
                onClick={() => {
                  navigator.clipboard?.writeText(roomCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy code"}
              </button>
              <p className="sub">
                {status === "waiting"
                  ? "Waiting for your friend to join..."
                  : status === "error"
                    ? detail || "Something went wrong."
                    : "Setting up the room..."}
              </p>
              {status === "waiting" && <div className="pulse-dot" />}
              {status === "error" && (
                <button className="big-btn" onClick={startHost}>
                  Try again
                </button>
              )}
            </>
          )}

          {mode === "join" && (
            <>
              <h2>Joining {code}</h2>
              <p className="sub">
                {status === "error"
                  ? detail || "Could not connect."
                  : "Connecting to the room..."}
              </p>
              {status !== "error" && <div className="pulse-dot" />}
              {status === "error" && (
                <button
                  className="big-btn"
                  onClick={() => {
                    drop();
                    setMode("choose");
                    setStatus("starting");
                  }}
                >
                  Back
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
