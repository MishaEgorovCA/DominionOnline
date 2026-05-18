import type { FastifyInstance } from "fastify";
import {
  applySplendorAction,
  createSplendorGame,
  type SplendorGameVersion,
} from "@splendor/engine";
import {
  loadSplendorRoom,
  saveSplendorRoom,
  newSplendorRoomId,
  type SplendorRoomData,
} from "../splendorPersist.js";
import { buildSplendorGameView, playerNameForId } from "../splendorViews.js";

type Client = { playerId: string; send: (s: string) => void };
const roomClients = new Map<string, Set<Client>>();

function getRoomClients(roomId: string): Set<Client> {
  if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
  return roomClients.get(roomId)!;
}

const GAME_VERSIONS: SplendorGameVersion[] = [
  "BASE_ORIENT",
  "BASE_ORIENT_CITIES",
  "BASE_ORIENT_TRADE_ROUTES",
];

function summarizeRoom(room: SplendorRoomData) {
  return {
    roomId: room.id,
    hostId: room.hostId,
    gameVersion: room.gameVersion ?? "BASE_ORIENT",
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      colour: p.colour,
    })),
    started: room.started,
  };
}

function broadcastRoom(room: SplendorRoomData): void {
  const clients = getRoomClients(room.id);
  for (const c of clients) {
    const view = room.game
      ? buildSplendorGameView(room.game, c.playerId, room)
      : null;
    c.send(
      JSON.stringify({
        type: "game",
        room: summarizeRoom(room),
        gameView: view,
        you: c.playerId,
        validActions: room.game?.curValidActions ?? [],
      }),
    );
  }
}

function handleMessage(
  room: SplendorRoomData,
  playerId: string,
  msg: Record<string, unknown>,
): void {
  const type = msg.type as string;

  if (type === "setName" && typeof msg.name === "string") {
    const p = room.players.find((x) => x.id === playerId);
    if (p) p.name = msg.name.trim() || "Player";
    saveSplendorRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "claimSeat" && typeof msg.seatIndex === "number") {
    if (room.started) return;
    const seat = msg.seatIndex;
    if (seat < 0 || seat > 3) return;
    const taken = room.players.some(
      (p) => p.id !== playerId && p.seat === seat,
    );
    if (taken) {
      sendError(room, playerId, "Seat already taken");
      return;
    }
    const p = room.players.find((x) => x.id === playerId);
    if (p) p.seat = seat;
    saveSplendorRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "setGameVersion" && typeof msg.version === "string") {
    if (room.hostId !== playerId || room.started) return;
    if (!GAME_VERSIONS.includes(msg.version as SplendorGameVersion)) {
      sendError(room, playerId, "Invalid game version");
      return;
    }
    room.gameVersion = msg.version as SplendorGameVersion;
    saveSplendorRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "startGame") {
    if (room.hostId !== playerId || room.started) return;
    const seated = room.players
      .filter((p) => p.seat !== null && p.seat !== undefined)
      .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
    if (seated.length < 2 || seated.length > 4) {
      sendError(room, playerId, "Need 2–4 players with a seat");
      return;
    }
    const names = seated.map((p) => p.name);
    const colours = seated.map((p) => p.colour ?? "3498db");
    const version = room.gameVersion ?? "BASE_ORIENT";
    room.game = createSplendorGame({
      playerNames: names,
      colours,
      version,
    });
    room.started = true;
    saveSplendorRoom(room);
    broadcastRoom(room);
    return;
  }

  if (type === "action" && typeof msg.action === "string") {
    if (!room.game || !room.started) return;
    const playerName = playerNameForId(room, playerId);
    if (!playerName) return;
    const payload =
      msg.payload && typeof msg.payload === "object"
        ? (msg.payload as Record<string, unknown>)
        : {};
    const res = applySplendorAction(room.game, playerName, {
      action: msg.action,
      payload,
    });
    if (res.error) {
      sendError(room, playerId, res.error);
      return;
    }
    room.game = res.state;
    saveSplendorRoom(room);
    broadcastRoom(room);
  }
}

function sendError(
  room: SplendorRoomData,
  playerId: string,
  message: string,
): void {
  for (const c of getRoomClients(room.id)) {
    if (c.playerId === playerId) {
      c.send(JSON.stringify({ type: "error", message }));
    }
  }
}

export async function registerSplendorRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post<{ Body: { name?: string } }>(
    "/api/splendor/rooms",
    async (req, reply) => {
      const id = newSplendorRoomId();
      const hostId = crypto.randomUUID();
      const raw = req.body?.name;
      const hostName =
        typeof raw === "string" && raw.trim() !== "" ? raw.trim() : "Player";
      const room: SplendorRoomData = {
        id,
        hostId,
        gameVersion: "BASE_ORIENT",
        players: [{ id: hostId, name: hostName, seat: 0 }],
        started: false,
        game: null,
      };
      saveSplendorRoom(room);
      return reply.send({ roomId: id, playerId: hostId });
    },
  );

  fastify.get("/api/splendor/rooms/:id", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const room = loadSplendorRoom(id);
    if (!room) return reply.code(404).send({ error: "not found" });
    return reply.send(summarizeRoom(room));
  });

  fastify.get("/ws/splendor", { websocket: true }, (socket, req) => {
    const q = new URL(req.url, "http://x").searchParams;
    const roomId = q.get("room");
    const playerId = q.get("player");
    const nameParam = q.get("name");
    const name =
      nameParam != null && nameParam.trim() !== ""
        ? nameParam.trim()
        : "Player";
    if (!roomId || !playerId) {
      socket.close(4000, "room and player required");
      return;
    }
    let room = loadSplendorRoom(roomId);
    if (!room) {
      socket.close(4002, "room not found");
      return;
    }

    const existing = room.players.find((p) => p.id === playerId);
    if (!existing) {
      room.players.push({ id: playerId, name, seat: null });
      saveSplendorRoom(room);
    } else if (existing.name !== name) {
      existing.name = name;
      saveSplendorRoom(room);
    }

    const client: Client = {
      playerId,
      send: (s: string) => socket.send(s),
    };
    const set = getRoomClients(roomId);
    set.add(client);
    broadcastRoom(room);

    socket.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const msg = JSON.parse(String(raw)) as Record<string, unknown>;
        room = loadSplendorRoom(roomId);
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
}
