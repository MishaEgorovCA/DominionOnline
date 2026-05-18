import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDeck, drawFromDeck, shuffleDeck, takeVisibleCard } from "./deck.js";
import { addValidAction, clearValidActions, getPlayerByName } from "./game.js";
import type {
  ActionResultCode,
  CityCard,
  PlayerState,
  SplendorGameState,
  TokenType,
} from "./types.js";

const GEM_TYPES: TokenType[] = ["White", "Blue", "Green", "Red", "Brown"];

export function loadCityCards(): CityCard[] {
  const dir = dirname(fileURLToPath(import.meta.url));
  const path = join(dir, "..", "resources", "citycards.csv");
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const cards: CityCard[] = [];
  for (let i = 1; i < lines.length; i++) {
    const card = lines[i]!.split(",");
    const cost = card[4]!.split(";");
    const tokenCost: Partial<Record<TokenType, number>> = {};
    for (const t of GEM_TYPES) tokenCost[t] = 0;
    for (let j = 0; j < 5; j++) {
      if (cost[j] !== "0") tokenCost[GEM_TYPES[j]!] = parseInt(cost[j]!, 10);
    }
    const numSameBonuses = parseInt(cost[5]!, 10);
    cards.push({
      kind: "city",
      id: card[6]!,
      prestigePoints: parseInt(card[2]!, 10),
      costType: "Token",
      tokenCost,
      numSameBonuses,
    });
  }
  return cards;
}

export function initCitiesBoard(state: SplendorGameState): void {
  state.citiesDeck = createDeck(loadCityCards());
  shuffleDeck(state.citiesDeck);
  drawFromDeck(state.citiesDeck, 3);
}

export function qualifiesCities(
  state: SplendorGameState,
  player: PlayerState,
): CityCard[] {
  if (!state.citiesDeck) return [];
  const out: CityCard[] = [];
  for (const city of state.citiesDeck.visible) {
    let ok = true;
    let maxSame = 0;
    for (const t of GEM_TYPES) {
      const bonus = player.bonuses[t] ?? 0;
      if (bonus > maxSame && (city.tokenCost[t] ?? 0) === 0) maxSame = bonus;
    }
    if (maxSame < city.numSameBonuses) ok = false;
    for (const t of GEM_TYPES) {
      const need = city.tokenCost[t] ?? 0;
      if ((player.bonuses[t] ?? 0) < need) ok = false;
    }
    if (player.prestigePoints < city.prestigePoints) ok = false;
    if (ok) {
      out.push(city);
      const list = player.citiesQualifiedFor ?? [];
      if (!list.some((c) => c.id === city.id)) {
        player.citiesQualifiedFor = [...list, city];
      }
    }
  }
  return out;
}

export function addCityToPlayer(
  state: SplendorGameState,
  playerName: string,
  results: ActionResultCode[],
): ActionResultCode[] {
  const player = getPlayerByName(state, playerName);
  if (!player || !state.citiesDeck) return results;
  const qualified = qualifiesCities(state, player);
  if (qualified.length === 1) {
    const city = qualified[0]!;
    player.cities = [...(player.cities ?? []), city];
    takeVisibleCard(state.citiesDeck, city, false);
  } else if (qualified.length > 1) {
    clearValidActions(state);
    results.push("MUST_CHOOSE_CITY");
    addValidAction(state, "CHOOSE_CITY");
  }
  return results;
}

export function canPlayerWinCities(
  state: SplendorGameState,
  player: PlayerState,
): boolean {
  return qualifiesCities(state, player).length > 0;
}

export function checkForWinCities(state: SplendorGameState): string[] | null {
  if (
    state.playersWhoCanWin.length > 0 &&
    state.turnCounter !== 0 &&
    state.turnCounter % (state.players.length - 1) === 0
  ) {
    let winners = [state.playersWhoCanWin[0]!];
    for (const name of state.playersWhoCanWin) {
      const p = getPlayerByName(state, name);
      const cur = getPlayerByName(state, winners[0]!);
      if (!p || !cur) continue;
      if (p.prestigePoints > cur.prestigePoints) {
        winners = [name];
      } else if (
        name !== winners[0] &&
        p.prestigePoints === cur.prestigePoints
      ) {
        if (!winners.includes(name)) winners.push(name);
        if (!winners.includes(cur.name)) winners.push(cur.name);
      }
    }
    state.winners = winners;
    state.gameOver = true;
    state.turnCounter = -10000;
    state.curValidActions = [];
    return winners;
  }
  return null;
}

export function runChooseCity(
  state: SplendorGameState,
  player: PlayerState,
  cityId: string,
  results: ActionResultCode[],
): void {
  const qualified = qualifiesCities(state, player);
  const city = qualified.find((c) => c.id === cityId);
  if (!city) throw new Error(`City '${cityId}' not available.`);
  player.cities = [...(player.cities ?? []), city];
  if (state.citiesDeck) takeVisibleCard(state.citiesDeck, city, false);
  if (state.curValidActions.includes("CHOOSE_CITY")) results.push("VALID_ACTION");
  results.push("TURN_COMPLETED");
  state.curValidActions = state.curValidActions.filter((a) => a !== "CHOOSE_CITY");
}

export function getCityFromId(
  state: SplendorGameState,
  id: string,
): CityCard | undefined {
  return state.citiesDeck?.visible.find((c) => c.id === id);
}
