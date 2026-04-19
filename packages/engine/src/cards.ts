/** Dominion 2nd edition base set — costs and types per rulebook */

export type CardType =
  | "action"
  | "treasure"
  | "victory"
  | "curse"
  | "attack"
  | "reaction";

export type CardId =
  | "copper"
  | "silver"
  | "gold"
  | "estate"
  | "duchy"
  | "province"
  | "curse"
  | "artisan"
  | "bandit"
  | "bureaucrat"
  | "cellar"
  | "chapel"
  | "council_room"
  | "festival"
  | "harbinger"
  | "laboratory"
  | "library"
  | "market"
  | "merchant"
  | "militia"
  | "mine"
  | "moat"
  | "moneylender"
  | "poacher"
  | "remodel"
  | "sentry"
  | "smithy"
  | "throne_room"
  | "vassal"
  | "village"
  | "witch"
  | "workshop"
  | "gardens";

export interface CardDef {
  id: CardId;
  name: string;
  cost: number;
  types: CardType[];
  treasureValue?: number;
  /** static vp or special */
  vp?: number | "gardens";
}

export const CARD_IDS: CardId[] = [
  "copper",
  "silver",
  "gold",
  "estate",
  "duchy",
  "province",
  "curse",
  "artisan",
  "bandit",
  "bureaucrat",
  "cellar",
  "chapel",
  "council_room",
  "festival",
  "harbinger",
  "laboratory",
  "library",
  "market",
  "merchant",
  "militia",
  "mine",
  "moat",
  "moneylender",
  "poacher",
  "remodel",
  "sentry",
  "smithy",
  "throne_room",
  "vassal",
  "village",
  "witch",
  "workshop",
  "gardens",
];

export const KINGDOM_IDS: CardId[] = [
  "artisan",
  "bandit",
  "bureaucrat",
  "cellar",
  "chapel",
  "council_room",
  "festival",
  "harbinger",
  "laboratory",
  "library",
  "market",
  "merchant",
  "militia",
  "mine",
  "moat",
  "moneylender",
  "poacher",
  "remodel",
  "sentry",
  "smithy",
  "throne_room",
  "vassal",
  "village",
  "witch",
  "workshop",
  "gardens",
];

export const RECOMMENDED_FIRST_GAME: CardId[] = [
  "cellar",
  "market",
  "merchant",
  "militia",
  "mine",
  "moat",
  "remodel",
  "smithy",
  "village",
  "workshop",
];

const DEFS: Record<CardId, CardDef> = {
  copper: { id: "copper", name: "Copper", cost: 0, types: ["treasure"], treasureValue: 1 },
  silver: { id: "silver", name: "Silver", cost: 3, types: ["treasure"], treasureValue: 2 },
  gold: { id: "gold", name: "Gold", cost: 6, types: ["treasure"], treasureValue: 3 },
  estate: { id: "estate", name: "Estate", cost: 2, types: ["victory"], vp: 1 },
  duchy: { id: "duchy", name: "Duchy", cost: 5, types: ["victory"], vp: 3 },
  province: { id: "province", name: "Province", cost: 8, types: ["victory"], vp: 6 },
  curse: { id: "curse", name: "Curse", cost: 0, types: ["curse"], vp: -1 },
  gardens: { id: "gardens", name: "Gardens", cost: 4, types: ["victory"], vp: "gardens" },

  artisan: { id: "artisan", name: "Artisan", cost: 6, types: ["action"] },
  bandit: { id: "bandit", name: "Bandit", cost: 5, types: ["action", "attack"] },
  bureaucrat: { id: "bureaucrat", name: "Bureaucrat", cost: 4, types: ["action", "attack"] },
  cellar: { id: "cellar", name: "Cellar", cost: 2, types: ["action"] },
  chapel: { id: "chapel", name: "Chapel", cost: 2, types: ["action"] },
  council_room: { id: "council_room", name: "Council Room", cost: 5, types: ["action"] },
  festival: { id: "festival", name: "Festival", cost: 5, types: ["action"] },
  harbinger: { id: "harbinger", name: "Harbinger", cost: 3, types: ["action"] },
  laboratory: { id: "laboratory", name: "Laboratory", cost: 5, types: ["action"] },
  library: { id: "library", name: "Library", cost: 5, types: ["action"] },
  market: { id: "market", name: "Market", cost: 5, types: ["action"] },
  merchant: { id: "merchant", name: "Merchant", cost: 3, types: ["action"] },
  militia: { id: "militia", name: "Militia", cost: 4, types: ["action", "attack"] },
  mine: { id: "mine", name: "Mine", cost: 5, types: ["action"] },
  moat: { id: "moat", name: "Moat", cost: 2, types: ["action", "reaction"] },
  moneylender: { id: "moneylender", name: "Moneylender", cost: 4, types: ["action"] },
  poacher: { id: "poacher", name: "Poacher", cost: 4, types: ["action"] },
  remodel: { id: "remodel", name: "Remodel", cost: 4, types: ["action"] },
  sentry: { id: "sentry", name: "Sentry", cost: 5, types: ["action"] },
  smithy: { id: "smithy", name: "Smithy", cost: 4, types: ["action"] },
  throne_room: { id: "throne_room", name: "Throne Room", cost: 4, types: ["action"] },
  vassal: { id: "vassal", name: "Vassal", cost: 3, types: ["action"] },
  village: { id: "village", name: "Village", cost: 3, types: ["action"] },
  witch: { id: "witch", name: "Witch", cost: 5, types: ["action", "attack"] },
  workshop: { id: "workshop", name: "Workshop", cost: 3, types: ["action"] },
};

export function getCard(id: CardId): CardDef {
  return DEFS[id];
}

export function isActionCard(id: CardId): boolean {
  return DEFS[id].types.includes("action");
}

export function isAttackCard(id: CardId): boolean {
  return DEFS[id].types.includes("attack");
}

export function isTreasure(id: CardId): boolean {
  return DEFS[id].types.includes("treasure");
}

export function isVictory(id: CardId): boolean {
  return DEFS[id].types.includes("victory");
}
