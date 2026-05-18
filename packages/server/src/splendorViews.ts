import type { SplendorGameState } from "@splendor/engine";
import type { DevelopmentCard, NobleCard, PlayerState } from "@splendor/engine";

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

  return {
    gameVersion: game.gameVersion,
    prestigePointsToWin: game.prestigePointsToWin,
    turnCounter: game.turnCounter,
    curValidActions: game.curValidActions,
    players: game.players.map((p) => scrubPlayer(p, viewer?.name === p.name)),
    tier1: game.tier1.visible,
    tier2: game.tier2.visible,
    tier3: game.tier3.visible,
    tier1Orient: game.tier1Orient.visible,
    tier2Orient: game.tier2Orient.visible,
    tier3Orient: game.tier3Orient.visible,
    nobles: game.nobles.visible,
    tokens: game.tokens,
    playersWhoCanWin: game.playersWhoCanWin,
    winners: game.winners,
    gameOver: game.gameOver,
    currentPlayer: game.players[game.turnCounter]?.name ?? null,
  };
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
    reservedCards: isViewer ? p.reservedCards : p.reservedCards.map(hideCard),
    reservedNobles: isViewer ? p.reservedNobles : p.reservedNobles.map(hideCard),
  };
}

function hideCard(c: DevelopmentCard | NobleCard): { id: string; hidden: true } {
  return { id: c.id, hidden: true };
}

export function playerNameForId(
  room: { players: { id: string; name: string }[] },
  playerId: string,
): string | null {
  return room.players.find((p) => p.id === playerId)?.name ?? null;
}
