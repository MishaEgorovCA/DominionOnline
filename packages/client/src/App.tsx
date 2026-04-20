import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCard, type Command } from "@dominion/engine";

type RoomSummary = {
  roomId: string;
  hostId: string;
  players: { id: string; name: string; seat: number | null }[];
  kingdom: string[] | null;
  started: boolean;
};

type GameView = {
  phase: string;
  whoseTurn: number;
  playerOrder: string[];
  supply: Record<string, number>;
  trash: string[];
  kingdom: string[];
  turnPhase: string;
  actions: number;
  buys: number;
  coins: number;
  pending: unknown;
  players: Record<
    string,
    {
      deckSize: number;
      handSize: number;
      discardSize: number;
      discardTop: string | null;
      inPlay: string[];
      setAside: string[];
    }
  >;
  yourHand?: string[];
  gameOverReason?: string;
  turnsTaken: Record<string, number>;
};

type WsMsg = {
  type: string;
  room?: RoomSummary;
  gameView?: GameView | null;
  you?: string;
  message?: string;
};

function cardLabel(id: string): string {
  try {
    return getCard(id as never).name;
  } catch {
    return id;
  }
}

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

  const activePid = useMemo(() => {
    if (!game) return null;
    return game.playerOrder[game.whoseTurn] ?? null;
  }, [game]);

  const isYourTurn = you && activePid === you;

  const toggleSel = (i: number) => {
    setSelected((s) =>
      s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b),
    );
  };

  const hand = game?.yourHand ?? [];

  const pending = game?.pending as { kind: string; player?: string } | null;

  return (
    <div className="layout">
      <h1>Dominion Online (2nd ed. base)</h1>

      {!roomId || !playerId ? (
        <div>
          <div className="row">
            <button type="button" onClick={createRoom}>
              Create room
            </button>
          </div>
          <p>Or join:</p>
          <div className="row">
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room code"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <button type="button" onClick={joinRoom} disabled={!roomId.trim()}>
              Join
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="row">
            Room: <strong>{roomId}</strong> — You: {name}{" "}
            <button type="button" onClick={() => send({ type: "setName", name })}>
              Update name
            </button>
            <button type="button" onClick={leaveToMenu}>
              Main menu
            </button>
          </p>
          {err && <div className="err">{err}</div>}

          {room && !room.started && (
            <div>
              <p>Players (pick a seat index, host starts the game):</p>
              <ul>
                {room.players.map((p) => (
                  <li key={p.id}>
                    {p.name} — seat {p.seat ?? "?"}{" "}
                    {p.id === you ? (
                      <span>
                        {[0, 1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              send({ type: "claimSeat", seatIndex: s })
                            }
                          >
                            {s}
                          </button>
                        ))}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {room.hostId === you && (
                <button type="button" onClick={() => send({ type: "startGame" })}>
                  Start game
                </button>
              )}
              <div className="row" style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => send({ type: "randomizeKingdom" })}
                  disabled={room.hostId !== you}
                >
                  Random kingdom
                </button>
              </div>
              <p>Kingdom: {(room.kingdom ?? []).map((k) => cardLabel(k)).join(", ")}</p>
            </div>
          )}

          {game && game.phase === "playing" && (
            <div>
              <p>
                Turn: {game.playerOrder[game.whoseTurn]?.slice(0, 8)}… — Phase:{" "}
                <strong>{game.turnPhase}</strong> — Actions {game.actions} — Buys{" "}
                {game.buys} — Coins {game.coins}
              </p>
              <div className="supply">
                {Object.entries(game.supply)
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => (
                    <div key={id} className="pile">
                      {cardLabel(id)} ×{n}
                    </div>
                  ))}
              </div>
              <p>Trash: {game.trash.length} cards</p>

              {game.playerOrder.map((pid) => (
                <div key={pid}>
                  {pid.slice(0, 8)}… — hand {game.players[pid]?.handSize} — deck{" "}
                  {game.players[pid]?.deckSize} — in play:{" "}
                  {(game.players[pid]?.inPlay ?? []).map(cardLabel).join(", ")}
                </div>
              ))}

              {pending && (
                <div className="prompt">
                  <strong>Prompt: {pending.kind}</strong>
                  {pending.kind === "moat" && pending.player === you && (
                    <div className="row">
                      <button
                        type="button"
                        onClick={() =>
                          sendCmd({ name: "respond_moat", reveal: true })
                        }
                      >
                        Reveal Moat
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendCmd({ name: "respond_moat", reveal: false })
                        }
                      >
                        Do not reveal
                      </button>
                    </div>
                  )}
                  {pending.kind === "militia_discard" &&
                    pending.player === you && (
                      <div>
                        <p>Select cards to discard (down to 3).</p>
                        <div className="hand">
                          {hand.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              className={
                                selected.includes(i) ? "card-btn selected" : "card-btn"
                              }
                              onClick={() => toggleSel(i)}
                            >
                              {cardLabel(c)}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            sendCmd({
                              name: "militia_discard",
                              handIndices: selected,
                            })
                          }
                        >
                          Discard selected
                        </button>
                      </div>
                    )}
                  <pre style={{ fontSize: "0.7rem", overflow: "auto" }}>
                    {JSON.stringify(pending, null, 2)}
                  </pre>
                  <p>Or send a raw engine command (JSON object with "name" field):</p>
                  <div className="row">
                    <input
                      style={{ flex: 1, minWidth: "200px" }}
                      value={rawCmd}
                      onChange={(e) => setRawCmd(e.target.value)}
                      placeholder='{"name":"cellar_discard","handIndices":[0,1]}'
                    />
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sendCmd(JSON.parse(rawCmd) as Command);
                          setRawCmd("");
                        } catch {
                          setErr("Invalid JSON command");
                        }
                      }}
                    >
                      Send command
                    </button>
                  </div>
                </div>
              )}

              {isYourTurn && !pending && (
                <div>
                  {game.turnPhase === "action" && (
                    <div>
                      <p>Your hand:</p>
                      <div className="hand">
                        {hand.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            className={
                              selected.includes(i) ? "card-btn selected" : "card-btn"
                            }
                            onClick={() => toggleSel(i)}
                          >
                            {cardLabel(c)}
                          </button>
                        ))}
                      </div>
                      <div className="row">
                        <button
                          type="button"
                          onClick={() => {
                            if (selected.length !== 1) return;
                            sendCmd({
                              name: "play_action",
                              handIndex: selected[0]!,
                            });
                            setSelected([]);
                          }}
                          disabled={selected.length !== 1}
                        >
                          Play selected action
                        </button>
                        <button
                          type="button"
                          onClick={() => send({ type: "command", command: { name: "enter_buy_phase" } })}
                        >
                          Go to buy phase
                        </button>
                      </div>
                    </div>
                  )}
                  {game.turnPhase === "buy" && (
                    <div>
                      <div className="row">
                        <button
                          type="button"
                          onClick={() => {
                            if (selected.length !== 1) return;
                            sendCmd({
                              name: "play_treasure",
                              handIndex: selected[0]!,
                            });
                            setSelected([]);
                          }}
                          disabled={selected.length !== 1}
                        >
                          Play treasure
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            sendCmd({ name: "play_all_treasures" })
                          }
                        >
                          Play all treasures
                        </button>
                      </div>
                      <p>Click a supply pile name in the list below, then Buy.</p>
                      <div className="row" style={{ flexWrap: "wrap" }}>
                        {Object.entries(game.supply)
                          .filter(([, n]) => n > 0)
                          .map(([id]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => sendCmd({ name: "buy", card: id as never })}
                            >
                              Buy {cardLabel(id)}
                            </button>
                          ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => sendCmd({ name: "end_turn" })}
                      >
                        End turn (cleanup)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {game.phase === "game_over" && (
                <p>
                  Game over: {game.gameOverReason}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
