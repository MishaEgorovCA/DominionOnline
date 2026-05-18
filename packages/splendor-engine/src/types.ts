export const TOKEN_TYPES = [
  "White",
  "Blue",
  "Green",
  "Red",
  "Brown",
  "Satchel",
  "Gold",
] as const;

export type TokenType = (typeof TOKEN_TYPES)[number];

export type CostType = "Token" | "Bonus";

export type CardTier = 1 | 2 | 3;

export type CascadeType = "None" | "Tier1" | "Tier2";

export type SplendorGameVersion =
  | "BASE_ORIENT"
  | "BASE_ORIENT_CITIES"
  | "BASE_ORIENT_TRADE_ROUTES";

export type ActionId =
  | "BUY_CARD"
  | "TAKE_TOKEN"
  | "RESERVE_CARD"
  | "CHOOSE_NOBLE"
  | "CASCADE_1"
  | "CASCADE_2"
  | "RESERVE_NOBLE"
  | "CHOOSE_SATCHEL_TOKEN"
  | "CHOOSE_CITY"
  | "TAKE_EXTRA_TOKEN_AFTER_PURCHASE_POWER";

export type ActionResultCode =
  | "VALID_ACTION"
  | "TURN_COMPLETED"
  | "INVALID_PLAYER"
  | "NOT_ENOUGH_TOKENS_ON_BOARD"
  | "NOT_ENOUGH_TOKENS_IN_INVENTORY"
  | "MAXIMUM_TOKENS_IN_INVENTORY"
  | "INVALID_TOKENS_GIVEN"
  | "MAXIMUM_CARDS_RESERVED"
  | "INVALID_TOKEN_CHOSEN"
  | "MUST_CHOOSE_NOBLE"
  | "MUST_CHOOSE_CASCADE_CARD_TIER_1"
  | "MUST_CHOOSE_CASCADE_CARD_TIER_2"
  | "MUST_RESERVE_NOBLE"
  | "MUST_CHOOSE_TOKEN_TYPE"
  | "MUST_CHOOSE_CITY"
  | "MUST_TAKE_EXTRA_TOKEN_AFTER_PURCHASE";

export type TokenMap = Partial<Record<TokenType, number>>;

export type BaseCard = {
  id: string;
  prestigePoints: number;
  costType: CostType;
  tokenCost: TokenMap;
};

export type DevelopmentCard = BaseCard & {
  kind: "development";
  cardTier: CardTier;
  tokenType: TokenType | null;
  bonus: number;
  orient?: {
    reserveNoble: boolean;
    cascadeType: CascadeType;
    isSatchel: boolean;
  };
};

export type NobleCard = BaseCard & { kind: "noble" };

export type CityCard = BaseCard & {
  kind: "city";
  numSameBonuses: number;
};

export type Card = DevelopmentCard | NobleCard | CityCard;

export type TradingPowersState = {
  extraTokenAfterPurchase: boolean;
  extraTokenAfterTakingSameColor: boolean;
  goldTokenWorthTwoTokens: boolean;
  addFivePrestigePoints: boolean;
  addPrestigePointsWithCoatsOfArms: boolean;
  addFivePrestigePointsUsed: boolean;
  coatsPrestigeAdded: number;
};

export type PlayerState = {
  name: string;
  colour: string;
  prestigePoints: number;
  tokens: Record<TokenType, number>;
  bonuses: Record<TokenType, number>;
  devCards: DevelopmentCard[];
  nobleCards: NobleCard[];
  reservedCards: DevelopmentCard[];
  reservedNobles: NobleCard[];
  /** Cities expansion */
  cities?: CityCard[];
  citiesQualifiedFor?: CityCard[];
  /** Trade Routes expansion */
  coatsOfArmsUnplaced?: number;
  powers?: TradingPowersState;
};

export type DeckState<T extends Card = Card> = {
  drawPile: T[];
  visible: T[];
};

export type SplendorGameState = {
  gameVersion: SplendorGameVersion;
  prestigePointsToWin: number;
  turnCounter: number;
  curValidActions: ActionId[];
  players: PlayerState[];
  tier1: DeckState<DevelopmentCard>;
  tier2: DeckState<DevelopmentCard>;
  tier3: DeckState<DevelopmentCard>;
  tier1Orient: DeckState<DevelopmentCard>;
  tier2Orient: DeckState<DevelopmentCard>;
  tier3Orient: DeckState<DevelopmentCard>;
  nobles: DeckState<NobleCard>;
  citiesDeck?: DeckState<CityCard>;
  tokens: Record<TokenType, number>;
  playersWhoCanWin: string[];
  winners: string[];
  gameOver: boolean;
};

export type SplendorAction =
  | { action: "BUY_CARD"; cardId: string; selectedTokens: TokenMap }
  | {
      action: "TAKE_TOKEN";
      takeTokens: TokenMap;
      putBackTokens: TokenMap;
    }
  | { action: "RESERVE_CARD"; cardId: string }
  | { action: "CHOOSE_NOBLE"; cardId: string }
  | { action: "CASCADE_1"; cardId: string }
  | { action: "CASCADE_2"; cardId: string }
  | { action: "RESERVE_NOBLE"; cardId: string }
  | {
      action: "CHOOSE_SATCHEL_TOKEN";
      cardId: string;
      selected: TokenType;
    }
  | { action: "CHOOSE_CITY"; cityId: string }
  | {
      action: "TAKE_EXTRA_TOKEN_AFTER_PURCHASE_POWER";
      takeToken?: TokenType;
      putBackToken?: TokenType;
    };
