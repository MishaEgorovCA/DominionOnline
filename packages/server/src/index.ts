import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import staticFiles from "@fastify/static";
import {
  applyCommand,
  createNewGame,
  randomKingdom,
  validateKingdom,
  RECOMMENDED_FIRST_GAME,
  type Command,
  type CardId,
} from "@dominion/engine";
import { loadRoom, saveRoom, newRoomId, type RoomData } from "./persist.js";
import { buildGameView } from "./views.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });
await fastify.register(websocket);

type Client = { playerId: string; send: (s: string) => void };
const roomClients = new Map<string, Set<Client>>();

function getRoomClients(roomId: string): Set<Client> {
  if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
  return roomClients.get(roomId)!;
}

function broadcastRoom(room: RoomData): void {
  const clients = getRoomClients(room.id);
  for (const c of clients) {
    const view = room.game ? buildGameView(room.game, c.playerId) : null;
    c.send(
      JSON.stringify({
        type: "game",
        room: summarizeRoom(room),
        gameView: view,
        you: c.playerId,
      }),
    );
  }
}

function summarizeRoom(room: RoomData) {
  return {
    roomId: room.id,
    hostId: room.hostId,
    players: room.players,
    kingdom: room.kingdom,
    started: room.started,
  };
}

fastify.post("/api/rooms", async (_req, reply) => {
  const id = newRoomId();
  const hostId = crypto.randomUUID();
  const room: RoomData = {
    id,
    hostId,
    players: [{ id: hostId, name: "Host", seat: 0 }],
    kingdom: [...RECOMMENDED_FIRST_GAME],
    started: false,
    game: null,
  };
  saveRoom(room);
  return reply.send({ roomId: id, playerId: hostId });
});

fastify.get("/api/rooms/:id", async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const room = loadRoom(id);
  if (!room) return reply.code(404).send({ error: "not found" });
  return reply.send(summarizeRoom(room));
});

fastify.get("/ws", { websocket: true }, (socket, req) => {
  const q = new URL(req.url, "http://x").searchParams;
  const roomId = q.get("room");
  const playerId = q.get("player");
  const name = q.get("name") ?? "Player";
  if (!roomId || !playerId) {
    socket.close(4000, "room and player required");
    return;
  }
  let room = loadRoom(roomId);
  if (!room) {
    socket.close(4002, "room not found");
    return;
  }

  if (!room.players.some((p) => p.id === playerId)) {
    room.players.push({ id: playerId, name, seat: null });
    saveRoom(room);
  }

  const client: Client = {
    playerId,
    send: (s: string) => {
      socket.send(s);
    },
  };
  const set = getRoomClients(roomId);
  set.add(client);

  broadcastRoom(room);

  socket.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      const msg = JSON.parse(String(raw)) as Record<string, unknown>;
      room = loadRoom(roomId);
      if (!room) return;
      handleMessage(room, playerId, msg);
    } catch (e) {
      socket.send(JSON.stringify({ type: "error", message: String(e) }));
    }
  });

  socket.on("close", () => {
    set.delete(client);
  });
});

function handleMessage(room: RoomData, playerId: string, msg: Record<string, unknown>): void {
  const type = msg.type as string;

  if (type === "setName" && typeof msg.name === "string") {
    const p = room.players.find((x) => x.id === playerId);
    if (p) p.name = msg.name;
    saveRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "claimSeat" && typeof msg.seatIndex === "number") {
    if (room.started) return;
    const p = room.players.find((x) => x.id === playerId);
    if (p) p.seat = msg.seatIndex;
    saveRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "setKingdom" && Array.isArray(msg.kingdom)) {
    if (room.hostId !== playerId || room.started) return;
    try {
      validateKingdom(msg.kingdom as CardId[]);
      room.kingdom = msg.kingdom as CardId[];
      saveRoom(room);
      broadcastRoom(room);
    } catch (e) {
      const clients = getRoomClients(room.id);
      for (const c of clients) {
        if (c.playerId === playerId)
          c.send(JSON.stringify({ type: "error", message: String(e) }));
      }
    }
    return;
  }

  if (type === "randomizeKingdom") {
    if (room.hostId !== playerId || room.started) return;
    room.kingdom = randomKingdom(() => Math.random());
    saveRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "shuffleSeats") {
    if (room.hostId !== playerId || room.started) return;
    if (room.players.length > 6) {
      const clients = getRoomClients(room.id);
      for (const c of clients) {
        if (c.playerId === playerId) {
          c.send(
            JSON.stringify({
              type: "error",
              message: "At most 6 players can have seats",
            }),
          );
        }
      }
      return;
    }
    const arr = room.players;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    arr.forEach((p, i) => {
      p.seat = i;
    });
    saveRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "startGame") {
    if (room.hostId !== playerId || room.started || !room.kingdom) return;
    const seated = room.players
      .filter((p) => p.seat !== null && p.seat !== undefined)
      .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
    if (seated.length < 2) {
      const clients = getRoomClients(room.id);
      for (const c of clients) {
        if (c.playerId === playerId)
          c.send(
            JSON.stringify({
              type: "error",
              message: "Need at least 2 players with a seat",
            }),
          );
      }
      return;
    }
    const order = seated.map((p) => p.id);
    room.game = createNewGame({ playerOrder: order, kingdom: room.kingdom });
    room.started = true;
    saveRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "command" && msg.command && typeof msg.command === "object") {
    if (!room.game) return;
    const cmd = msg.command as Command;
    const res = applyCommand(room.game, playerId, cmd);
    if (res.error) {
      const clients = getRoomClients(room.id);
      for (const c of clients) {
        if (c.playerId === playerId)
          c.send(JSON.stringify({ type: "error", message: res.error }));
      }
      return;
    }
    room.game = res.state;
    saveRoom(room);
    broadcastRoom(room);
  }
}

const clientStatic = process.env.CLIENT_DIST;
if (clientStatic) {
  await fastify.register(staticFiles, {
    root: clientStatic,
    prefix: "/",
  });
}

const port = Number(process.env.PORT ?? 3333);
await fastify.listen({ port, host: "0.0.0.0" });
