import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CardTier,
  CascadeType,
  CostType,
  DevelopmentCard,
  NobleCard,
  TokenMap,
  TokenType,
} from "./types.js";

const GEM_TYPES: TokenType[] = ["White", "Blue", "Green", "Red", "Brown"];

function emptyTokenMap(): Record<TokenType, number> {
  return {
    White: 0,
    Blue: 0,
    Green: 0,
    Red: 0,
    Brown: 0,
    Satchel: 0,
    Gold: 0,
  };
}

export function resolveCardsCsvPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundled = join(here, "..", "resources", "cards.csv");
  return bundled;
}

export function loadCardsFromCsv(csvPath?: string): {
  tier1: DevelopmentCard[];
  tier2: DevelopmentCard[];
  tier3: DevelopmentCard[];
  tier1Orient: DevelopmentCard[];
  tier2Orient: DevelopmentCard[];
  tier3Orient: DevelopmentCard[];
  nobles: NobleCard[];
} {
  const path = csvPath ?? resolveCardsCsvPath();
  const raw = readFileSync(path, "utf-8");
  const tier1: DevelopmentCard[] = [];
  const tier2: DevelopmentCard[] = [];
  const tier3: DevelopmentCard[] = [];
  const tier1Orient: DevelopmentCard[] = [];
  const tier2Orient: DevelopmentCard[] = [];
  const tier3Orient: DevelopmentCard[] = [];
  const nobles: NobleCard[] = [];

  let lineNum = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNum++;
    if (lineNum === 1 || !line.trim()) continue;
    const card = line.split(",");
    const tokenCostParts = card[4]!.split(";");
    const tokenCost: TokenMap = { ...emptyTokenMap() };
    for (let i = 0; i < 5; i++) {
      if (tokenCostParts[i] && tokenCostParts[i] !== "0") {
        tokenCost[GEM_TYPES[i]!] = Number.parseInt(tokenCostParts[i]!, 10);
      }
    }
    const prestigePoints = Number.parseInt(card[2]!, 10);
    const bonusCount = Number.parseInt(card[1]!, 10);
    const costType = card[3]!.trim() as CostType;
    const tokenTypeRaw = card[0]!.trim();
    const tokenType =
      tokenTypeRaw === "" ? null : (tokenTypeRaw as TokenType);
    const isSatchel = tokenType === "Satchel";
    const cardId = card[6]!.trim();
    const tier = card[5]!.trim();

    const base = {
      id: cardId,
      prestigePoints,
      costType,
      tokenCost,
    };

    switch (tier) {
      case "1":
        tier1.push({
          ...base,
          kind: "development",
          cardTier: 1,
          tokenType,
          bonus: bonusCount,
        });
        break;
      case "2":
        tier2.push({
          ...base,
          kind: "development",
          cardTier: 2,
          tokenType,
          bonus: bonusCount,
        });
        break;
      case "3":
        tier3.push({
          ...base,
          kind: "development",
          cardTier: 3,
          tokenType,
          bonus: bonusCount,
        });
        break;
      case "N":
        nobles.push({ ...base, kind: "noble" });
        break;
      case "O1":
        tier1Orient.push({
          ...base,
          kind: "development",
          cardTier: 1,
          tokenType,
          bonus: bonusCount,
          orient: {
            reserveNoble: false,
            cascadeType: "None",
            isSatchel,
          },
        });
        break;
      case "O2": {
        let cascadeType: CascadeType = "None";
        let reserveNoble = false;
        if (card[7]?.trim()) cascadeType = "Tier1";
        else if (card[8]?.trim()) reserveNoble = true;
        tier2Orient.push({
          ...base,
          kind: "development",
          cardTier: 2,
          tokenType,
          bonus: bonusCount,
          orient: { reserveNoble, cascadeType, isSatchel },
        });
        break;
      }
      case "O3": {
        const cascadeType: CascadeType = card[7]?.trim() ? "Tier2" : "None";
        tier3Orient.push({
          ...base,
          kind: "development",
          cardTier: 3,
          tokenType,
          bonus: bonusCount,
          orient: { reserveNoble: false, cascadeType, isSatchel },
        });
        break;
      }
      default:
        throw new Error(`Invalid card row tier: ${tier}`);
    }
  }

  return { tier1, tier2, tier3, tier1Orient, tier2Orient, tier3Orient, nobles };
}

export function cloneCard<T extends DevelopmentCard | NobleCard>(c: T): T {
  return structuredClone(c);
}
