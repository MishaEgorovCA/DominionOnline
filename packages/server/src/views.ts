import type { GameState, PlayerId } from "@dominion/engine";

export type PlayerPublic = {
  deckSize: number;
  handSize: number;
  discardSize: number;
  discardTop: string | null;
  inPlay: string[];
  setAside: string[];
};

export type GameView = {
  phase: GameState["phase"];
  whoseTurn: number;
  playerOrder: PlayerId[];
  supply: GameState["supply"];
  trash: string[];
  kingdom: string[];
  turnPhase: GameState["turnPhase"];
  actions: number;
  buys: number;
  coins: number;
  pending: GameState["pending"];
  players: Record<PlayerId, PlayerPublic>;
  /** Your hand — only for viewer */
  yourHand?: string[];
  gameOverReason?: string;
  turnsTaken: Record<PlayerId, number>;
};

export function buildGameView(state: GameState, viewerId: PlayerId | null): GameView {
  const players: Record<PlayerId, PlayerPublic> = {};
  for (const pid of state.playerOrder) {
    const p = state.players[pid];
    const discardTop =
      p.discard.length > 0 ? p.discard[p.discard.length - 1]! : null;
    players[pid] = {
      deckSize: p.deck.length,
      handSize: p.hand.length,
      discardSize: p.discard.length,
      discardTop,
      inPlay: [...p.inPlay],
      setAside: [...p.setAside],
    };
  }
  const view: GameView = {
    phase: state.phase,
    whoseTurn: state.whoseTurn,
    playerOrder: state.playerOrder,
    supply: state.supply,
    trash: state.trash,
    kingdom: state.kingdom,
    turnPhase: state.turnPhase,
    actions: state.actions,
    buys: state.buys,
    coins: state.coins,
    pending: state.pending,
    players,
    turnsTaken: state.turnsTaken,
    gameOverReason: state.gameOverReason,
  };
  if (viewerId && state.players[viewerId]) {
    view.yourHand = [...state.players[viewerId].hand];
  }
  return view;
}
