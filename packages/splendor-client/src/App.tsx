import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader.js";
import { GameScreen } from "./components/GameScreen.js";
import { LobbyScreen } from "./components/LobbyScreen.js";
import { MainMenuScreen } from "./components/MainMenuScreen.js";
import { getDisplayName, setDisplayName } from "@dominion/shared/displayName";
import type { GameView, RoomSummary } from "./types.js";
import { useRoomWebSocket } from "./useRoomWebSocket.js";
const GAME_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function gameRoomUrl(roomId: string): string {
  return `${GAME_BASE}?room=${encodeURIComponent(roomId)}`;
}

export function App() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState(getDisplayName);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [validActions, setValidActions] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const { send, status: wsStatus } = useRoomWebSocket(
    roomId,
    playerId,
    name,
    (msg) => {
      if (msg.type === "error" && msg.message) setErr(msg.message);
      if (msg.type === "game") {
        setErr(null);
        if (msg.room) setRoom(msg.room as RoomSummary);
        setGame((msg.gameView ?? null) as GameView | null);
        if (msg.you) setYou(msg.you);
        if (msg.validActions) setValidActions(msg.validActions);
      }
    },
  );

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("room");
    const pid = sessionStorage.getItem("splendor_pid");
    const rstore = sessionStorage.getItem("splendor_room");
    if (r && pid) {
      setRoomId(r);
      setPlayerId(pid);
    } else if (rstore && pid) {
      setRoomId(rstore);
      setPlayerId(pid);
    }
  }, []);

  useEffect(() => {
    setDisplayName(name);
  }, [name]);

  const createRoom = async () => {
    const res = await fetch("/api/splendor/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "Player" }),
    });
    const j = (await res.json()) as { roomId: string; playerId: string };
    sessionStorage.setItem("splendor_pid", j.playerId);
    sessionStorage.setItem("splendor_room", j.roomId);
    setPlayerId(j.playerId);
    setRoomId(j.roomId);
    window.history.replaceState({}, "", gameRoomUrl(j.roomId));
  };

  const joinRoom = () => {
    const pid = crypto.randomUUID();
    sessionStorage.setItem("splendor_pid", pid);
    sessionStorage.setItem("splendor_room", roomId.trim());
    setPlayerId(pid);
    window.history.replaceState({}, "", gameRoomUrl(roomId.trim()));
  };

  const leaveToMenu = useCallback(() => {
    sessionStorage.removeItem("splendor_pid");
    sessionStorage.removeItem("splendor_room");
    setRoomId("");
    setPlayerId(null);
    setRoom(null);
    setGame(null);
    setYou(null);
    setErr(null);
    setValidActions([]);
    window.history.replaceState({}, "", GAME_BASE);
  }, []);

  const myName =
    room?.players.find((p) => p.id === you)?.name ?? name;

  const inRoom = Boolean(roomId && playerId);
  const showLobby = Boolean(room && !room.started);
  const showGame = Boolean(room?.started && game);

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
            onNameCommit={(committed) => send({ type: "setName", name: committed })}
            onLeave={leaveToMenu}
          />
          {wsStatus === "reconnecting" && (
            <p className="banner">Reconnecting…</p>
          )}
          {err && <div className="err">{err}</div>}
          {showLobby && room && you && (
            <LobbyScreen room={room} you={you} send={send} />
          )}
          {room?.started && !game && (
            <p className="banner">Loading game…</p>
          )}
          {showGame && game && you && (
            <GameScreen
              game={game}
              myName={myName}
              validActions={validActions}
              send={send}
            />
          )}
        </>
      )}
    </div>
  );
}
