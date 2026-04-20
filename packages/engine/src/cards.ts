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
  /** Short rules text for UI tooltips */
  summary: string;
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
  copper: {
    id: "copper",
    name: "Copper",
    cost: 0,
    types: ["treasure"],
    treasureValue: 1,
    summary: "Play in your Buy phase for +1 coin.",
  },
  silver: {
    id: "silver",
    name: "Silver",
    cost: 3,
    types: ["treasure"],
    treasureValue: 2,
    summary: "Play in your Buy phase for +2 coins.",
  },
  gold: {
    id: "gold",
    name: "Gold",
    cost: 6,
    types: ["treasure"],
    treasureValue: 3,
    summary: "Play in your Buy phase for +3 coins.",
  },
  estate: {
    id: "estate",
    name: "Estate",
    cost: 2,
    types: ["victory"],
    vp: 1,
    summary: "Worth 1 VP at the end of the game.",
  },
  duchy: {
    id: "duchy",
    name: "Duchy",
    cost: 5,
    types: ["victory"],
    vp: 3,
    summary: "Worth 3 VP at the end of the game.",
  },
  province: {
    id: "province",
    name: "Province",
    cost: 8,
    types: ["victory"],
    vp: 6,
    summary: "Worth 6 VP at the end of the game.",
  },
  curse: {
    id: "curse",
    name: "Curse",
    cost: 0,
    types: ["curse"],
    vp: -1,
    summary: "Worth -1 VP at the end of the game.",
  },
  gardens: {
    id: "gardens",
    name: "Gardens",
    cost: 4,
    types: ["victory"],
    vp: "gardens",
    summary: "Worth 1 VP per 10 cards you have (round down).",
  },

  artisan: {
    id: "artisan",
    name: "Artisan",
    cost: 6,
    types: ["action"],
    summary:
      "Gain a card costing up to 5 to your hand, then put a card from your hand onto your deck.",
  },
  bandit: {
    id: "bandit",
    name: "Bandit",
    cost: 5,
    types: ["action", "attack"],
    summary:
      "Gain a Gold. Each other player reveals the top 2 cards of their deck, trashes a revealed Treasure other than Copper, and discards the rest.",
  },
  bureaucrat: {
    id: "bureaucrat",
    name: "Bureaucrat",
    cost: 4,
    types: ["action", "attack"],
    summary:
      "Gain a Silver onto your deck. Each other player reveals a Victory from hand and puts it onto their deck, or reveals a hand with no Victories.",
  },
  cellar: {
    id: "cellar",
    name: "Cellar",
    cost: 2,
    types: ["action"],
    summary: "+1 Action. Discard any number of cards, then +1 Card per card discarded.",
  },
  chapel: {
    id: "chapel",
    name: "Chapel",
    cost: 2,
    types: ["action"],
    summary: "Trash up to 4 cards from your hand.",
  },
  council_room: {
    id: "council_room",
    name: "Council Room",
    cost: 5,
    types: ["action"],
    summary: "+4 Cards, +1 Buy. Each other player draws a card.",
  },
  festival: {
    id: "festival",
    name: "Festival",
    cost: 5,
    types: ["action"],
    summary: "+2 Actions, +1 Buy, +2 coins.",
  },
  harbinger: {
    id: "harbinger",
    name: "Harbinger",
    cost: 3,
    types: ["action"],
    summary:
      "+1 Card, +1 Action. Look through your discard pile; you may put a card from it onto your deck.",
  },
  laboratory: {
    id: "laboratory",
    name: "Laboratory",
    cost: 5,
    types: ["action"],
    summary: "+2 Cards, +1 Action.",
  },
  library: {
    id: "library",
    name: "Library",
    cost: 5,
    types: ["action"],
    summary:
      "Draw until you have 7 cards in hand, skipping Actions you choose to set aside; discard set-aside cards afterward.",
  },
  market: {
    id: "market",
    name: "Market",
    cost: 5,
    types: ["action"],
    summary: "+1 Card, +1 Action, +1 Buy, +1 coin.",
  },
  merchant: {
    id: "merchant",
    name: "Merchant",
    cost: 3,
    types: ["action"],
    summary:
      "+1 Card, +1 Action. The first time you play a Silver this turn, +1 coin.",
  },
  militia: {
    id: "militia",
    name: "Militia",
    cost: 4,
    types: ["action", "attack"],
    summary: "+2 coins. Each other player discards down to 3 cards in hand.",
  },
  mine: {
    id: "mine",
    name: "Mine",
    cost: 5,
    types: ["action"],
    summary:
      "You may trash a Treasure from your hand. Gain a Treasure to your hand costing up to 3 more than it.",
  },
  moat: {
    id: "moat",
    name: "Moat",
    cost: 2,
    types: ["action", "reaction"],
    summary:
      "+2 Cards. Reaction: when another player plays an Attack, you may reveal this from your hand first to be unaffected by that Attack.",
  },
  moneylender: {
    id: "moneylender",
    name: "Moneylender",
    cost: 4,
    types: ["action"],
    summary: "You may trash a Copper from your hand for +3 coins.",
  },
  poacher: {
    id: "poacher",
    name: "Poacher",
    cost: 4,
    types: ["action"],
    summary: "+1 Card, +1 Action, +1 coin. Discard a card per empty Supply pile.",
  },
  remodel: {
    id: "remodel",
    name: "Remodel",
    cost: 4,
    types: ["action"],
    summary:
      "Trash a card from your hand. Gain a card costing up to 2 more than the trashed card.",
  },
  sentry: {
    id: "sentry",
    name: "Sentry",
    cost: 5,
    types: ["action"],
    summary:
      "+1 Card, +1 Action. Look at the top 2 cards of your deck; trash and/or discard any; put the rest back on top in any order.",
  },
  smithy: {
    id: "smithy",
    name: "Smithy",
    cost: 4,
    types: ["action"],
    summary: "+3 Cards.",
  },
  throne_room: {
    id: "throne_room",
    name: "Throne Room",
    cost: 4,
    types: ["action"],
    summary: "You may play an Action card from your hand twice.",
  },
  vassal: {
    id: "vassal",
    name: "Vassal",
    cost: 3,
    types: ["action"],
    summary:
      "+2 coins. Discard the top card of your deck. If it’s an Action, you may play it.",
  },
  village: {
    id: "village",
    name: "Village",
    cost: 3,
    types: ["action"],
    summary: "+1 Card, +2 Actions.",
  },
  witch: {
    id: "witch",
    name: "Witch",
    cost: 5,
    types: ["action", "attack"],
    summary: "+2 Cards. Each other player gains a Curse.",
  },
  workshop: {
    id: "workshop",
    name: "Workshop",
    cost: 3,
    types: ["action"],
    summary: "Gain a card costing up to 4.",
  },
};

export function getCard(id: CardId): CardDef {
  return DEFS[id];
}

/** Multi-line string for tooltips: name, cost, types, mechanical notes, summary. */
export function formatCardTooltip(id: CardId | string): string {
  try {
    const c = getCard(id as CardId);
    const typeStr = c.types
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(" · ");
    const lines: string[] = [c.name, `Cost: ${c.cost}`, `Types: ${typeStr}`];
    if (c.treasureValue != null) {
      lines.push(`Treasure: +${c.treasureValue} coin(s) when played in Buy phase.`);
    }
    if (c.vp !== undefined) {
      if (c.vp === "gardens") lines.push("Victory: see summary for VP.");
      else lines.push(`Victory: ${c.vp} VP at end of game.`);
    }
    lines.push(c.summary);
    return lines.join("\n\n");
  } catch {
    return String(id);
  }
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
