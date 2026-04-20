export type RoomSummary = {
  roomId: string;
  hostId: string;
  players: { id: string; name: string; seat: number | null }[];
  kingdom: string[] | null;
  started: boolean;
};

export type GameView = {
  phase: string;
  whoseTurn: number;
  playerOrder: string[];
  supply: Record<string, number>;
  trash: string[];
  kingdom: string[];
  turnPhase: string;
  actions: number;
  buys: number;
  coins: number;
  pending: unknown;
  players: Record<
    string,
    {
      deckSize: number;
      handSize: number;
      discardSize: number;
      discardTop: string | null;
      inPlay: string[];
      setAside: string[];
    }
  >;
  yourHand?: string[];
  gameOverReason?: string;
  turnsTaken: Record<string, number>;
};
