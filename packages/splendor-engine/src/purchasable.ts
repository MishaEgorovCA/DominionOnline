import type { Card, DevelopmentCard, PlayerState, TokenMap, TokenType } from "./types.js";

export function isPurchasable(
  card: Card,
  player: PlayerState,
  tokensToUse: TokenMap,
): boolean {
  if (!hasTokens(player, tokensToUse)) return false;

  if (card.costType === "Bonus") {
    const cost = { ...card.tokenCost };
    for (const t of Object.keys(cost) as TokenType[]) {
      cost[t] = (cost[t] ?? 0) - (player.bonuses[t] ?? 0);
    }
    return Object.values(cost).every((v) => (v ?? 0) <= 0);
  }

  const cost = { ...card.tokenCost };
  for (const t of Object.keys(cost) as TokenType[]) {
    cost[t] = (cost[t] ?? 0) - (player.bonuses[t] ?? 0);
  }

  const tokens = { ...tokensToUse };
  for (const t of Object.keys(tokens) as TokenType[]) {
    if (t === "Gold") continue;
    const amt = tokens[t] ?? 0;
    if (amt > 0) {
      cost[t] = (cost[t] ?? 0) - amt;
    }
  }

  const goldUsed = tokens.Gold ?? 0;
  for (let i = 0; i < goldUsed; i++) {
    for (const t of Object.keys(cost) as TokenType[]) {
      if ((cost[t] ?? 0) > 0) {
        cost[t] = (cost[t] ?? 0) - 1;
        break;
      }
    }
  }

  return Object.values(cost).every((v) => (v ?? 0) <= 0);
}

function hasTokens(player: PlayerState, check: TokenMap): boolean {
  for (const [k, v] of Object.entries(check)) {
    if (!v) continue;
    if ((player.tokens[k as TokenType] ?? 0) < v) return false;
  }
  return true;
}

export function canBuySatchel(player: PlayerState): boolean {
  return player.devCards.some(
    (c) =>
      c.tokenType &&
      c.tokenType !== "Satchel" &&
      c.tokenType !== "Gold",
  );
}

export function setSatchelTokenType(
  card: DevelopmentCard,
  assigned: TokenType,
): void {
  if (card.tokenType !== "Satchel") return;
  card.tokenType = assigned;
}
