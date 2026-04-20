import { useCallback, useEffect, useState } from "react";
import type { Command } from "@dominion/engine";
import { AppHeader } from "./components/AppHeader.js";
import { GameScreen } from "./components/GameScreen.js";
import { LobbyScreen } from "./components/LobbyScreen.js";
import { MainMenuScreen } from "./components/MainMenuScreen.js";
import type { GameView, RoomSummary } from "./types.js";
import { useRoomWebSocket, type WsMsg } from "./useRoomWebSocket.js";

const DISPLAY_NAME_KEY = "dominion_display_name";

export function App() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState(() => {
    try {
      const s = localStorage.getItem(DISPLAY_NAME_KEY);
      if (s?.trim()) return s.trim();
    } catch {
      /* ignore */
    }
    return "Player";
  });
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [rawCmd, setRawCmd] = useState("");

  const { send, status: wsStatus } = useRoomWebSocket(
    roomId,
    playerId,
    name,
    (msg: WsMsg) => {
      if (msg.type === "error" && msg.message) setErr(msg.message);
      if (msg.type === "game") {
        setErr(null);
        if (msg.room) setRoom(msg.room as RoomSummary);
        setGame((msg.gameView ?? null) as GameView | null);
        if (msg.you) setYou(msg.you);
      }
    },
  );

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
    try {
      localStorage.setItem(DISPLAY_NAME_KEY, name);
    } catch {
      /* ignore */
    }
  }, [name]);

  const createRoom = async () => {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "Player" }),
    });
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

  const pendingKey = game ? JSON.stringify(game.pending) : "";
  useEffect(() => {
    setSelected([]);
  }, [pendingKey]);

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
          {wsStatus === "reconnecting" && (
            <p className="app-lobby__hint" style={{ padding: "0.5rem 1rem" }}>
              Reconnecting…
            </p>
          )}
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
