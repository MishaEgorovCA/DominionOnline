import type { Card, DeckState } from "./types.js";
import { cloneCard } from "./cards.js";

export function createDeck<T extends Card>(cards: T[]): DeckState<T> {
  return { drawPile: cards.map((c) => cloneCard(c)), visible: [] };
}

export function shuffleDeck<T extends Card>(deck: DeckState<T>): void {
  const pile = deck.drawPile;
  for (let i = pile.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pile[i], pile[j]] = [pile[j]!, pile[i]!];
  }
}

export function drawFromDeck<T extends Card>(
  deck: DeckState<T>,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const c = deck.drawPile.pop();
    if (c) deck.visible.push(c);
  }
}

export function takeVisibleCard<T extends Card>(
  deck: DeckState<T>,
  card: T,
  replenish = true,
): T | null {
  const idx = deck.visible.findIndex((c) => c.id === card.id);
  if (idx === -1) return null;
  const [taken] = deck.visible.splice(idx, 1);
  if (replenish && card.kind === "development") {
    drawFromDeck(deck, 1);
  }
  return taken ?? null;
}
