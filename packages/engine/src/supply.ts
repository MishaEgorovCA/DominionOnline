import type { CardId } from "./cards.js";
import { getCard, KINGDOM_IDS } from "./cards.js";

export type PlayerCount = 2 | 3 | 4 | 5 | 6;

export function pileSizeVictory(playerCount: PlayerCount, card: CardId): number {
  if (card === "gardens") {
    return playerCount === 2 ? 8 : 12;
  }
  if (card === "estate" || card === "duchy" || card === "province") {
    return playerCount === 2 ? 8 : 12;
  }
  return 0;
}

export function pileSizeCurse(playerCount: PlayerCount): number {
  if (playerCount === 2) return 10;
  if (playerCount === 3) return 20;
  if (playerCount === 4) return 30;
  if (playerCount === 5) return 40;
  return 50;
}

export function provinceCount(playerCount: PlayerCount): number {
  if (playerCount <= 4) return playerCount === 2 ? 8 : 12;
  if (playerCount === 5) return 15;
  return 18;
}

/** Empty piles to end game (3 for 2-4, 4 for 5-6) */
export function emptyPilesToEnd(playerCount: PlayerCount): number {
  return playerCount >= 5 ? 4 : 3;
}

export function createSupply(
  playerCount: PlayerCount,
  kingdom: CardId[],
): Record<CardId, number> {
  const supply = {} as Record<CardId, number>;
  for (const k of KINGDOM_IDS) supply[k] = 0;

  const startingCoppers = playerCount * 7;
  supply.copper = 60 - startingCoppers;
  supply.silver = 40;
  supply.gold = 30;
  supply.estate = pileSizeVictory(playerCount, "estate");
  supply.duchy = pileSizeVictory(playerCount, "duchy");
  supply.province = provinceCount(playerCount);
  supply.curse = pileSizeCurse(playerCount);

  for (const k of kingdom) {
    if (!KINGDOM_IDS.includes(k)) throw new Error(`Invalid kingdom card: ${k}`);
    const isVictoryKingdom = getCard(k).types.includes("victory");
    supply[k] = isVictoryKingdom ? pileSizeVictory(playerCount, k) : 10;
  }

  return supply;
}

export function validateKingdom(kingdom: CardId[]): void {
  if (kingdom.length !== 10) throw new Error("Kingdom must have exactly 10 cards");
  const set = new Set(kingdom);
  if (set.size !== 10) throw new Error("Kingdom cards must be unique");
  for (const k of kingdom) {
    if (!KINGDOM_IDS.includes(k)) throw new Error(`Not a kingdom card: ${k}`);
  }
}

export function randomKingdom(rng: () => number): CardId[] {
  const pool = [...KINGDOM_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 10);
}
