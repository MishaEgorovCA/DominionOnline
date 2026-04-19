import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CardId, GameState } from "@dominion/engine";

export type RoomData = {
  id: string;
  hostId: string;
  players: { id: string; name: string; seat: number | null }[];
  kingdom: CardId[] | null;
  started: boolean;
  game: GameState | null;
};

const cache = new Map<string, RoomData>();

export function getDataDir(): string {
  return process.env.DATA_DIR ?? join(process.cwd(), "data");
}

function roomPath(id: string): string {
  return join(getDataDir(), "rooms", `${id}.json`);
}

export function loadRoom(id: string): RoomData | null {
  if (cache.has(id)) return cache.get(id)!;
  const p = roomPath(id);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf-8");
  const data = JSON.parse(raw) as RoomData;
  cache.set(id, data);
  return data;
}

export function saveRoom(data: RoomData): void {
  cache.set(data.id, data);
  const dir = join(getDataDir(), "rooms");
  mkdirSync(dir, { recursive: true });
  writeFileSync(roomPath(data.id), JSON.stringify(data, null, 2), "utf-8");
}

export function newRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const rng = Math.random;
  for (let i = 0; i < 6; i++) s += chars[Math.floor(rng() * chars.length)];
  return s;
}
