import { useCallback, useEffect, useRef, useState } from "react";
import type { Command } from "@dominion/engine";
import { AppHeader } from "./components/AppHeader.js";
import { GameScreen } from "./components/GameScreen.js";
import { LobbyScreen } from "./components/LobbyScreen.js";
import { MainMenuScreen } from "./components/MainMenuScreen.js";
import type { GameView, RoomSummary } from "./types.js";

type WsMsg = {
  type: string;
  room?: RoomSummary;
  gameView?: GameView | null;
  you?: string;
  message?: string;
};

export function App() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("Player");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [rawCmd, setRawCmd] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((obj: object) => {
    wsRef.current?.send(JSON.stringify(obj));
  }, []);

  const sendCmd = useCallback(
    (command: Command) => {
      send({ type: "command", command });
    },
    [send],
  );

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("room");
    const pid = sessionStorage.getItem("dominion_pid");
    const rstore = sessionStorage.getItem("dominion_room");
    if (r && pid) {
      setRoomId(r);
      setPlayerId(pid);
    } else if (rstore && pid) {
      setRoomId(rstore);
      setPlayerId(pid);
    }
  }, []);

  useEffect(() => {
    if (!roomId || !playerId) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${proto}//${host}/ws?room=${encodeURIComponent(roomId)}&player=${encodeURIComponent(playerId)}&name=${encodeURIComponent(name)}`;
    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as WsMsg;
      if (msg.type === "error" && msg.message) setErr(msg.message);
      if (msg.type === "game") {
        setErr(null);
        if (msg.room) setRoom(msg.room);
        setGame(msg.gameView ?? null);
        if (msg.you) setYou(msg.you);
      }
    };
    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomId, playerId, name]);

  const createRoom = async () => {
    const res = await fetch("/api/rooms", { method: "POST" });
    const j = (await res.json()) as { roomId: string; playerId: string };
    sessionStorage.setItem("dominion_pid", j.playerId);
    sessionStorage.setItem("dominion_room", j.roomId);
    setPlayerId(j.playerId);
    setRoomId(j.roomId);
    window.history.replaceState({}, "", `?room=${j.roomId}`);
  };

  const joinRoom = () => {
    const pid = crypto.randomUUID();
    sessionStorage.setItem("dominion_pid", pid);
    sessionStorage.setItem("dominion_room", roomId.trim());
    setPlayerId(pid);
    window.history.replaceState({}, "", `?room=${roomId.trim()}`);
  };

  const leaveToMenu = useCallback(() => {
    if (room?.started) {
      if (
        !window.confirm(
          "Leave this game and return to the main menu? You can create or join another room.",
        )
      ) {
        return;
      }
    }
    sessionStorage.removeItem("dominion_pid");
    sessionStorage.removeItem("dominion_room");
    setRoomId("");
    setPlayerId(null);
    setRoom(null);
    setGame(null);
    setYou(null);
    setErr(null);
    setSelected([]);
    setRawCmd("");
    window.history.replaceState({}, "", window.location.pathname);
  }, [room?.started]);

  const toggleSel = (i: number) => {
    setSelected((s) =>
      s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b),
    );
  };

  const hand = game?.yourHand ?? [];

  const showLobby = Boolean(room && !room.started);
  const showGame = Boolean(room?.started && game);

  const inRoom = Boolean(roomId && playerId);

  return (
    <div className="app-root">
      {!inRoom ? (
        <MainMenuScreen
          roomId={roomId}
          name={name}
          onRoomIdChange={setRoomId}
          onNameChange={setName}
          onCreateRoom={createRoom}
          onJoin={joinRoom}
        />
      ) : (
        <>
          <AppHeader
            roomId={roomId}
            name={name}
            onNameChange={setName}
            onNameCommit={(committed) =>
              send({ type: "setName", name: committed })
            }
            onLeave={leaveToMenu}
          />
          {err && <div className="err">{err}</div>}
          {showLobby && room && you && (
            <LobbyScreen room={room} you={you} send={send} />
          )}
          {room?.started && !game && (
            <p className="app-lobby__hint" style={{ padding: "1rem" }}>
              Loading game…
            </p>
          )}
          {showGame && game && you && room && (
            <GameScreen
              room={room}
              game={game}
              you={you}
              send={send}
              sendCmd={sendCmd}
              hand={hand}
              selected={selected}
              toggleSel={toggleSel}
              setSelected={setSelected}
              rawCmd={rawCmd}
              setRawCmd={setRawCmd}
              setErr={setErr}
            />
          )}
        </>
      )}
    </div>
  );
}
