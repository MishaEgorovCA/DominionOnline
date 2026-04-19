import type { CardId } from "./cards.js";
import { getCard, isTreasure } from "./cards.js";
import type { GameState, PlayerId, PlayerState } from "./model.js";
import { mulberry32, shuffleInPlace } from "./rng.js";

export function nextRng(state: GameState): () => number {
  return mulberry32(state.rngSeed);
}

export function consumeRng(state: GameState, rng: () => number): void {
  state.rngSeed = (state.rngSeed + Math.floor(rng() * 1e9) + 1) >>> 0;
}

export function drawCards(
  state: GameState,
  pid: PlayerId,
  n: number,
): CardId[] {
  const p = state.players[pid];
  const drawn: CardId[] = [];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) break;
      const rng = nextRng(state);
      p.deck = [...p.discard];
      p.discard = [];
      shuffleInPlace(p.deck, rng);
      consumeRng(state, rng);
    }
    if (p.deck.length === 0) break;
    drawn.push(p.deck.shift()!);
  }
  p.hand.push(...drawn);
  return drawn;
}

export function shufflePlayerDeck(state: GameState, pid: PlayerId): void {
  const p = state.players[pid];
  const rng = nextRng(state);
  shuffleInPlace(p.deck, rng);
  consumeRng(state, rng);
}

export function gainCard(
  state: GameState,
  pid: PlayerId,
  card: CardId,
  to: "discard" | "hand" | "deck_top" = "discard",
): boolean {
  if (state.supply[card] <= 0) return false;
  state.supply[card]--;
  const p = state.players[pid];
  if (to === "discard") p.discard.push(card);
  else if (to === "hand") p.hand.push(card);
  else p.deck.unshift(card);
  return true;
}

export function trashFromHand(
  state: GameState,
  pid: PlayerId,
  handIndex: number,
): CardId | null {
  const p = state.players[pid];
  if (handIndex < 0 || handIndex >= p.hand.length) return null;
  const [c] = p.hand.splice(handIndex, 1);
  state.trash.push(c);
  return c;
}

export function discardFromHand(
  state: GameState,
  pid: PlayerId,
  handIndex: number,
): CardId | null {
  const p = state.players[pid];
  if (handIndex < 0 || handIndex >= p.hand.length) return null;
  const [c] = p.hand.splice(handIndex, 1);
  p.discard.push(c);
  return c;
}

export function moveHandToPlay(
  state: GameState,
  pid: PlayerId,
  handIndex: number,
): CardId | null {
  const p = state.players[pid];
  if (handIndex < 0 || handIndex >= p.hand.length) return null;
  const [c] = p.hand.splice(handIndex, 1);
  p.inPlay.push(c);
  return c;
}

export function topOfDiscard(pid: PlayerState): CardId | null {
  if (pid.discard.length === 0) return null;
  return pid.discard[pid.discard.length - 1];
}

export function countVictoryPointsForPlayer(
  pid: PlayerId,
  state: GameState,
): number {
  const p = state.players[pid];
  const all: CardId[] = [
    ...p.deck,
    ...p.hand,
    ...p.discard,
    ...p.inPlay,
    ...p.setAside,
  ];
  let vp = 0;
  const totalCards = all.length;
  for (const c of all) {
    const def = getCard(c);
    if (def.vp === undefined) continue;
    if (def.vp === "gardens") {
      vp += Math.floor(totalCards / 10);
    } else {
      vp += def.vp;
    }
  }
  return vp;
}

export function totalCardsInDeckDiscardHandPlay(pid: PlayerState): number {
  return (
    pid.deck.length +
    pid.hand.length +
    pid.discard.length +
    pid.inPlay.length +
    pid.setAside.length
  );
}

export function revealTopCards(
  state: GameState,
  pid: PlayerId,
  n: number,
): CardId[] {
  const p = state.players[pid];
  const out: CardId[] = [];
  for (let i = 0; i < n; i++) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) break;
      const rng = nextRng(state);
      p.deck = [...p.discard];
      p.discard = [];
      shuffleInPlace(p.deck, rng);
      consumeRng(state, rng);
    }
    if (p.deck.length === 0) break;
    out.push(p.deck[0]);
  }
  return out;
}

export function removeTopOfDeck(state: GameState, pid: PlayerId): CardId | null {
  const p = state.players[pid];
  if (p.deck.length === 0) {
    if (p.discard.length === 0) return null;
    const rng = nextRng(state);
    p.deck = [...p.discard];
    p.discard = [];
    shuffleInPlace(p.deck, rng);
    consumeRng(state, rng);
  }
  if (p.deck.length === 0) return null;
  return p.deck.shift()!;
}

export function discardCardId(state: GameState, pid: PlayerId, card: CardId): void {
  const p = state.players[pid];
  const idx = p.deck.indexOf(card);
  if (idx >= 0) {
    p.deck.splice(idx, 1);
    p.discard.push(card);
    return;
  }
  throw new Error("discardCardId: card not on top logic — use explicit remove");
}

export function isTreasureNonCopper(c: CardId): boolean {
  return isTreasure(c) && c !== "copper";
}
