import type { DevelopmentCard, NobleCard, PlayerState, TokenMap, TokenType } from "./types.js";
import { TOKEN_TYPES } from "./types.js";
import { cloneCard } from "./cards.js";

const DEFAULT_COLOURS = ["e74c3c", "3498db", "2ecc71", "f39c12"];

export function createPlayer(
  name: string,
  colour = DEFAULT_COLOURS[0]!,
): PlayerState {
  const tokens = Object.fromEntries(
    TOKEN_TYPES.map((t) => [t, 0]),
  ) as Record<TokenType, number>;
  const bonuses = { ...tokens };
  return {
    name,
    colour,
    prestigePoints: 0,
    tokens,
    bonuses,
    devCards: [],
    nobleCards: [],
    reservedCards: [],
    reservedNobles: [],
  };
}

export function assignColours(players: PlayerState[]): void {
  players.forEach((p, i) => {
    p.colour = DEFAULT_COLOURS[i % DEFAULT_COLOURS.length]!;
  });
}

export function addTokens(player: PlayerState, add: TokenMap): void {
  for (const [k, v] of Object.entries(add)) {
    if (!v) continue;
    const t = k as TokenType;
    player.tokens[t] = (player.tokens[t] ?? 0) + v;
  }
}

export function removeTokens(player: PlayerState, rem: TokenMap): void {
  for (const [k, v] of Object.entries(rem)) {
    if (!v) continue;
    const t = k as TokenType;
    player.tokens[t] = (player.tokens[t] ?? 0) - v;
  }
}

export function hasTokens(player: PlayerState, check: TokenMap): boolean {
  for (const [k, v] of Object.entries(check)) {
    if (!v) continue;
    const t = k as TokenType;
    if ((player.tokens[t] ?? 0) < v) return false;
  }
  return true;
}

export function takeTokens(
  player: PlayerState,
  take: TokenMap,
  putBack: TokenMap,
): void {
  addTokens(player, take);
  removeTokens(player, putBack);
}

export function tokenCount(player: PlayerState): number {
  return TOKEN_TYPES.reduce((s, t) => s + player.tokens[t], 0);
}

export function burnBonuses(
  player: PlayerState,
  burn: TokenMap,
): void {
  const type = TOKEN_TYPES.find((t) => (burn[t] ?? 0) > 0);
  if (!type) return;
  const toRemove = findOptimizedBurn(player, type);
  for (const c of toRemove) {
    if (!c) continue;
    player.devCards = player.devCards.filter((x) => x.id !== c.id);
    if (c.tokenType) {
      player.bonuses[c.tokenType] -= c.bonus;
    }
    player.prestigePoints -= c.prestigePoints;
  }
}

function findOptimizedBurn(
  player: PlayerState,
  type: TokenType,
): (DevelopmentCard | undefined)[] {
  let lowestSingle: DevelopmentCard | undefined;
  let lowestDouble: DevelopmentCard | undefined;
  let satchel = false;
  const cards = [...player.devCards];

  for (const c of cards) {
    if (c.tokenType !== type) continue;
    if (c.bonus === 2) {
      if (
        !lowestDouble ||
        c.prestigePoints < lowestDouble.prestigePoints
      ) {
        lowestDouble = c;
      }
    } else {
      if (
        !lowestSingle ||
        c.prestigePoints < lowestSingle.prestigePoints ||
        c.orient?.isSatchel
      ) {
        lowestSingle = c;
        if (c.orient?.isSatchel) satchel = true;
      }
    }
  }

  const list: (DevelopmentCard | undefined)[] = [lowestSingle];
  const rest = cards.filter((c) => c !== lowestSingle);
  let second: DevelopmentCard | undefined;
  for (const c of rest) {
    if (c.tokenType !== type || c.bonus !== 1) continue;
    if (
      !second ||
      c.prestigePoints < second.prestigePoints ||
      c.orient?.isSatchel
    ) {
      second = c;
      if (c.orient?.isSatchel) satchel = true;
    }
  }
  list.push(second);

  if (satchel) return list;

  if (lowestDouble) {
    const s0 = list[0];
    const s1 = list[1];
    if (!s0 || !s1) return [lowestDouble];
    if (s0.prestigePoints + s1.prestigePoints > lowestDouble.prestigePoints) {
      return [lowestDouble];
    }
  }
  return list;
}

export function getReservedDev(
  player: PlayerState,
  id: string,
): DevelopmentCard | undefined {
  return player.reservedCards.find((c) => c.id === id);
}

export function getPurchasedDev(
  player: PlayerState,
  id: string,
): DevelopmentCard | undefined {
  return player.devCards.find((c) => c.id === id);
}

export function addDevCard(player: PlayerState, card: DevelopmentCard): void {
  player.devCards.push(cloneCard(card));
}

export function addNoble(player: PlayerState, noble: NobleCard): void {
  player.nobleCards.push(cloneCard(noble));
  player.prestigePoints += 3;
}
