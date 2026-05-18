import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIX_LETTER = /^[a-z]{6}$/;

let words6Cache: string[] | null = null;

export function getDataDir(): string {
  return process.env.DATA_DIR ?? join(process.cwd(), "data");
}

/** Bundled copy (after build), repo docs (tsx dev), or WORD_LIST_PATH override */
export function resolveWordsPath(): string | null {
  const env = process.env.WORD_LIST_PATH;
  if (env && existsSync(env)) return env;
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "..", "..", "server", "dist", "resource", "words_alpha.txt");
  if (existsSync(bundled)) return bundled;
  const serverSrc = join(here, "..", "..", "server", "src", "resource", "words_alpha.txt");
  if (existsSync(serverSrc)) return serverSrc;
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

/** Room codes should not end in "s" (product preference). */
export function finalizeRoomId(id: string): string {
  if (!id.endsWith("s")) return id;
  const last =
    Array.from("abcdefghijklmnopqrstuvwxyz")
      .filter((c) => c !== "s")
      .join("") + "0123456789";
  return id.slice(0, -1) + last[Math.floor(Math.random() * last.length)];
}

function randomAlphanumericId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return finalizeRoomId(s);
}

export type RoomStore<T> = {
  load: (id: string) => T | null;
  save: (data: T & { id: string }) => void;
  newRoomId: () => string;
};

export function createRoomStore<T extends { id: string }>(
  namespace: string,
): RoomStore<T> {
  const cache = new Map<string, T>();

  function roomPath(id: string): string {
    return join(getDataDir(), namespace, "rooms", `${id}.json`);
  }

  function roomIdTaken(id: string): boolean {
    if (cache.has(id)) return true;
    return existsSync(roomPath(id));
  }

  function newRoomId(): string {
    const words = getSixLetterWords().filter((w) => !w.endsWith("s"));
    if (words.length === 0) return randomAlphanumericId();
    for (let attempt = 0; attempt < 50; attempt++) {
      const id = finalizeRoomId(words[Math.floor(Math.random() * words.length)]!);
      if (!roomIdTaken(id)) return id;
    }
    return randomAlphanumericId();
  }

  function load(id: string): T | null {
    if (cache.has(id)) return cache.get(id)!;
    const p = roomPath(id);
    if (!existsSync(p)) return null;
    const raw = readFileSync(p, "utf-8");
    const data = JSON.parse(raw) as T;
    cache.set(id, data);
    return data;
  }

  function save(data: T & { id: string }): void {
    cache.set(data.id, data);
    const dir = join(getDataDir(), namespace, "rooms");
    mkdirSync(dir, { recursive: true });
    writeFileSync(roomPath(data.id), JSON.stringify(data, null, 2), "utf-8");
  }

  return { load, save, newRoomId };
}
