import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

const SIX_LETTER = /^[a-z]{6}$/;

let words6Cache: string[] | null = null;

export function getDataDir(): string {
  return process.env.DATA_DIR ?? join(process.cwd(), "data");
}

function roomPath(id: string): string {
  return join(getDataDir(), "rooms", `${id}.json`);
}

/** Bundled copy (after build), repo docs (tsx dev), or WORD_LIST_PATH override */
function resolveWordsPath(): string | null {
  const env = process.env.WORD_LIST_PATH;
  if (env && existsSync(env)) return env;
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "resource", "words_alpha.txt");
  if (existsSync(bundled)) return bundled;
  const repoDocs = join(here, "..", "..", "..", "docs", "words_alpha.txt");
  if (existsSync(repoDocs)) return repoDocs;
  return null;
}

function getSixLetterWords(): string[] {
  if (words6Cache) return words6Cache;
  const path = resolveWordsPath();
  if (!path) {
    words6Cache = [];
    return words6Cache;
  }
  const raw = readFileSync(path, "utf-8");
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const w = line.trim();
    if (w.length === 6 && SIX_LETTER.test(w)) out.push(w);
  }
  words6Cache = out;
  return words6Cache;
}

function roomIdTaken(id: string): boolean {
  if (cache.has(id)) return true;
  return existsSync(roomPath(id));
}

function randomAlphanumericId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
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
  const words = getSixLetterWords();
  if (words.length === 0) return randomAlphanumericId();
  for (let attempt = 0; attempt < 50; attempt++) {
    const id = words[Math.floor(Math.random() * words.length)]!;
    if (!roomIdTaken(id)) return id;
  }
  return randomAlphanumericId();
}
