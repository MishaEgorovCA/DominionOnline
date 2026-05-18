import type { SplendorGameState } from "@splendor/engine";
import type {
  Card,
  CityCard,
  DevelopmentCard,
  NobleCard,
  PlayerState,
} from "@splendor/engine";
function deckView<T extends Card>(deck: { visible: T[]; drawPile: unknown[] }) {
  return {
    visibleCards: deck.visible,
    canDraw: deck.drawPile.length > 0,
  };
}

/** Client-facing snapshot (hides opponent reserved cards). */
export function buildSplendorGameView(
  game: SplendorGameState,
  viewerPlayerId: string | null,
  room: { players: { id: string; name: string }[] },
): Record<string, unknown> {
  const viewerName = playerNameForId(room, viewerPlayerId ?? "");
  const viewer =
    viewerName != null
      ? game.players.find((p) => p.name === viewerName)
      : undefined;

  const base: Record<string, unknown> = {
    gameVersion: game.gameVersion,
    prestigePointsToWin: game.prestigePointsToWin,
    turnCounter: game.turnCounter,
    curValidActions: game.curValidActions,
    players: game.players.map((p) => scrubPlayer(p, viewer?.name === p.name)),
    tier1Deck: deckView(game.tier1),
    tier2Deck: deckView(game.tier2),
    tier3Deck: deckView(game.tier3),
    tier1OrientDeck: deckView(game.tier1Orient),
    tier2OrientDeck: deckView(game.tier2Orient),
    tier3OrientDeck: deckView(game.tier3Orient),
    nobleDeck: deckView(game.nobles),
    tokens: game.tokens,
    playersWhoCanWin: game.playersWhoCanWin,
    winners: game.winners,
    gameOver: game.gameOver,
    currentPlayer: game.players[game.turnCounter]?.name ?? null,
    // Legacy flat arrays for older clients
    tier1: game.tier1.visible,
    tier2: game.tier2.visible,
    tier3: game.tier3.visible,
    tier1Orient: game.tier1Orient.visible,
    tier2Orient: game.tier2Orient.visible,
    tier3Orient: game.tier3Orient.visible,
    nobles: game.nobles.visible,
  };

  if (game.citiesDeck) {
    base.cityDeck = deckView(game.citiesDeck);
  }

  return base;
}

function scrubPlayer(p: PlayerState, isViewer: boolean): Record<string, unknown> {
  return {
    name: p.name,
    colour: p.colour,
    prestigePoints: p.prestigePoints,
    tokens: p.tokens,
    bonuses: p.bonuses,
    devCards: p.devCards,
    nobleCards: p.nobleCards,
    reservedCards: isViewer ? p.reservedCards : p.reservedCards.map(hideDev),
    reservedNobles: isViewer ? p.reservedNobles : p.reservedNobles.map(hideCard),
    cities: p.cities ?? [],
    citiesQualifiedFor: isViewer ? (p.citiesQualifiedFor ?? []) : [],
    coatsOfArmsUnplaced: p.coatsOfArmsUnplaced,
    powers: p.powers,
  };
}

function hideDev(c: DevelopmentCard): { id: string; hidden: true } {
  return { id: c.id, hidden: true };
}

function hideCard(c: DevelopmentCard | NobleCard | CityCard): {
  id: string;
  hidden: true;
} {
  return { id: c.id, hidden: true };
}

export function playerNameForId(
  room: { players: { id: string; name: string }[] },
  playerId: string,
): string | null {
  return room.players.find((p) => p.id === playerId)?.name ?? null;
}
