export type SplendorGameVersion =
  | "BASE_ORIENT"
  | "BASE_ORIENT_CITIES"
  | "BASE_ORIENT_TRADE_ROUTES";

export type RoomSummary = {
  roomId: string;
  hostId: string;
  gameVersion?: SplendorGameVersion;
  players: {
    id: string;
    name: string;
    seat: number | null;
    colour?: string;
  }[];
  started: boolean;
};

export type DeckView = {
  visibleCards: CardView[];
  canDraw: boolean;
};

export type GameView = {
  gameVersion?: SplendorGameVersion;
  currentPlayer: string | null;
  curValidActions: string[];
  gameOver: boolean;
  winners: string[];
  prestigePointsToWin?: number;
  tokens: Record<string, number>;
  tier1Deck?: DeckView;
  tier2Deck?: DeckView;
  tier3Deck?: DeckView;
  tier1OrientDeck?: DeckView;
  tier2OrientDeck?: DeckView;
  tier3OrientDeck?: DeckView;
  nobleDeck?: DeckView;
  cityDeck?: DeckView;
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
  numSameBonuses?: number;
  hidden?: true;
};

export type PlayerView = {
  name: string;
  colour: string;
  prestigePoints: number;
  tokens: Record<string, number>;
  bonuses: Record<string, number>;
  devCards: CardView[];
  nobleCards?: CardView[];
  reservedCards: (CardView | { id: string; hidden: true })[];
  reservedNobles?: (CardView | { id: string; hidden: true })[];
  cities?: CardView[];
  citiesQualifiedFor?: CardView[];
  coatsOfArmsUnplaced?: number;
  powers?: Record<string, boolean | number>;
};
