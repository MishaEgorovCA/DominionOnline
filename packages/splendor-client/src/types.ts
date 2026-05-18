export type RoomSummary = {
  roomId: string;
  hostId: string;
  players: {
    id: string;
    name: string;
    seat: number | null;
    colour?: string;
  }[];
  started: boolean;
};

export type GameView = {
  currentPlayer: string | null;
  curValidActions: string[];
  gameOver: boolean;
  winners: string[];
  tokens: Record<string, number>;
  tier1: CardView[];
  tier2: CardView[];
  tier3: CardView[];
  tier1Orient: CardView[];
  tier2Orient: CardView[];
  tier3Orient: CardView[];
  nobles: CardView[];
  players: PlayerView[];
};

export type CardView = {
  id: string;
  prestigePoints: number;
  tokenType?: string | null;
  bonus?: number;
  costType?: string;
  tokenCost?: Record<string, number>;
  kind?: string;
};

export type PlayerView = {
  name: string;
  colour: string;
  prestigePoints: number;
  tokens: Record<string, number>;
  bonuses: Record<string, number>;
  devCards: CardView[];
  reservedCards: (CardView | { id: string; hidden: true })[];
};
