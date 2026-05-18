import { loadCardsFromCsv } from "./cards.js";
import { cloneCard } from "./cards.js";
import {
  createDeck,
  drawFromDeck,
  shuffleDeck,
  takeVisibleCard,
} from "./deck.js";
import {
  addDevCard,
  addNoble,
  addTokens,
  assignColours,
  burnBonuses,
  createPlayer,
  getPurchasedDev,
  getReservedDev,
  removeTokens,
  tokenCount,
} from "./player.js";
import { checkForWinCities, initCitiesBoard, qualifiesCities } from "./cities.js";
import { createTradingPostsPlayer } from "./tradingPosts.js";
import type {
  ActionId,
  ActionResultCode,
  Card,
  CityCard,
  DevelopmentCard,
  NobleCard,
  PlayerState,
  SplendorGameState,
  SplendorGameVersion,
  TokenMap,
  TokenType,
} from "./types.js";
import { TOKEN_TYPES } from "./types.js";

export function createOrientGame(
  version: SplendorGameVersion = "BASE_ORIENT",
  prestigePointsToWin = 15,
  turnCounter = 0,
): SplendorGameState {
  const loaded = loadCardsFromCsv();
  const winPoints =
    version === "BASE_ORIENT_CITIES" ? -1 : prestigePointsToWin;
  return {
    gameVersion: version,
    prestigePointsToWin: winPoints,
    turnCounter,
    curValidActions: ["BUY_CARD", "TAKE_TOKEN", "RESERVE_CARD"],
    players: [],
    tier1: createDeck(loaded.tier1),
    tier2: createDeck(loaded.tier2),
    tier3: createDeck(loaded.tier3),
    tier1Orient: createDeck(loaded.tier1Orient),
    tier2Orient: createDeck(loaded.tier2Orient),
    tier3Orient: createDeck(loaded.tier3Orient),
    nobles: createDeck(loaded.nobles),
    tokens: Object.fromEntries(TOKEN_TYPES.map((t) => [t, 0])) as Record<
      TokenType,
      number
    >,
    playersWhoCanWin: [],
    winners: [],
    gameOver: false,
  };
}

export function initBoard(state: SplendorGameState): void {
  shuffleDeck(state.tier1);
  shuffleDeck(state.tier2);
  shuffleDeck(state.tier3);
  shuffleDeck(state.tier1Orient);
  shuffleDeck(state.tier2Orient);
  shuffleDeck(state.tier3Orient);
  shuffleDeck(state.nobles);
  drawFromDeck(state.tier1, 4);
  drawFromDeck(state.tier2, 4);
  drawFromDeck(state.tier3, 4);
  drawFromDeck(state.tier1Orient, 2);
  drawFromDeck(state.tier2Orient, 2);
  drawFromDeck(state.tier3Orient, 2);
  drawFromDeck(state.nobles, state.players.length + 1);

  let pile = 4;
  if (state.players.length === 3) pile = 5;
  if (state.players.length === 4) pile = 7;
  for (const t of ["White", "Blue", "Green", "Red", "Brown"] as TokenType[]) {
    state.tokens[t] = pile;
  }
  state.tokens.Satchel = 0;
  state.tokens.Gold = 5;
  if (state.gameVersion === "BASE_ORIENT_CITIES") {
    initCitiesBoard(state);
  }
}

export function launchNewGame(
  playerNames: string[],
  colours?: string[],
  version: SplendorGameVersion = "BASE_ORIENT",
): SplendorGameState {
  if (playerNames.length < 2 || playerNames.length > 4) {
    throw new Error("2-4 players required");
  }
  const game = createOrientGame(version, 15, 0);
  game.players = playerNames.map((name, i) => {
    if (version === "BASE_ORIENT_TRADE_ROUTES") {
      return createTradingPostsPlayer(name, colours?.[i] ?? "");
    }
    const p = createPlayer(name, colours?.[i] ?? "");
    if (version === "BASE_ORIENT_CITIES") {
      p.cities = [];
      p.citiesQualifiedFor = [];
    }
    return p;
  });
  if (!colours?.length) assignColours(game.players);
  initBoard(game);
  return game;
}

export function getCurrentPlayer(state: SplendorGameState): PlayerState {
  return state.players[state.turnCounter]!;
}

export function getPlayerByName(
  state: SplendorGameState,
  name: string,
): PlayerState | undefined {
  return state.players.find((p) => p.name === name);
}

export function getCardFromId(
  state: SplendorGameState,
  id: string,
): Card | undefined {
  if (state.citiesDeck) {
    const city = state.citiesDeck.visible.find((c) => c.id === id);
    if (city) return city;
  }
  for (const d of [
    state.tier1,
    state.tier2,
    state.tier3,
    state.tier1Orient,
    state.tier2Orient,
    state.tier3Orient,
    state.nobles,
  ]) {
    const found = d.visible.find((c) => c.id === id);
    if (found) return found;
  }
  return undefined;
}

export function takeCardFromBoard(
  state: SplendorGameState,
  card: Card,
): Card | null {
  if (card.kind === "city" && state.citiesDeck) {
    return takeVisibleCard(state.citiesDeck, card as CityCard, false);
  }
  if (card.kind === "noble") {
    return takeVisibleCard(state.nobles, card, false);
  }
  const decks = [
    state.tier1,
    state.tier2,
    state.tier3,
    state.tier1Orient,
    state.tier2Orient,
    state.tier3Orient,
  ];
  for (const d of decks) {
    const t = takeVisibleCard(d, card as DevelopmentCard);
    if (t) return t;
  }
  return null;
}

export function addBoardTokens(state: SplendorGameState, add: TokenMap): void {
  for (const [k, v] of Object.entries(add)) {
    if (!v) continue;
    const t = k as TokenType;
    if (v > 0) state.tokens[t] = (state.tokens[t] ?? 0) + v;
  }
}

export function removeBoardTokens(
  state: SplendorGameState,
  rem: TokenMap,
): boolean {
  for (const [k, v] of Object.entries(rem)) {
    if (!v) continue;
    const t = k as TokenType;
    const left = (state.tokens[t] ?? 0) - v;
    if (left < 0) return false;
  }
  for (const [k, v] of Object.entries(rem)) {
    if (!v) continue;
    state.tokens[k as TokenType] -= v;
  }
  return true;
}

export function qualifiesForNoble(
  state: SplendorGameState,
  player: PlayerState,
): NobleCard[] {
  const nobles: NobleCard[] = [
    ...state.nobles.visible,
    ...player.reservedNobles.map(cloneCard),
  ];
  const out: NobleCard[] = [];
  for (const noble of nobles) {
    let ok = true;
    for (const t of Object.keys(noble.tokenCost) as TokenType[]) {
      const need = noble.tokenCost[t] ?? 0;
      if (need > (player.bonuses[t] ?? 0)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(noble);
  }
  return out;
}

export function incrementTurn(state: SplendorGameState): void {
  state.turnCounter =
    state.turnCounter >= state.players.length - 1 ? 0 : state.turnCounter + 1;
  state.curValidActions = ["BUY_CARD", "TAKE_TOKEN", "RESERVE_CARD"];
}

export function clearValidActions(state: SplendorGameState): void {
  state.curValidActions = [];
}

export function addValidAction(state: SplendorGameState, a: ActionId): void {
  if (!state.curValidActions.includes(a)) state.curValidActions.push(a);
}

export function removeValidAction(state: SplendorGameState, a: ActionId): void {
  state.curValidActions = state.curValidActions.filter((x) => x !== a);
}

export function canPlayerWin(state: SplendorGameState, player: PlayerState): boolean {
  if (state.gameVersion === "BASE_ORIENT_CITIES") {
    return qualifiesCities(state, player).length > 0;
  }
  return player.prestigePoints >= state.prestigePointsToWin;
}

export function checkForWin(state: SplendorGameState): string[] | null {
  if (state.gameVersion === "BASE_ORIENT_CITIES") {
    return checkForWinCities(state);
  }
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
      if (p.devCards.length < cur.devCards.length) {
        winners = [name];
      } else if (
        name !== winners[0] &&
        p.devCards.length === cur.devCards.length
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

export function finishTurnIfNeeded(
  state: SplendorGameState,
  results: ActionResultCode[],
): void {
  const turnDone = results.includes("TURN_COMPLETED");
  const onlyValidAndTurn =
    results.includes("VALID_ACTION") &&
    results.includes("TURN_COMPLETED") &&
    results.filter(
      (r) => r !== "VALID_ACTION" && r !== "TURN_COMPLETED",
    ).length === 0 &&
    state.curValidActions.length === 0;

  if (turnDone && onlyValidAndTurn) {
    const w = checkForWin(state);
    if (!w) incrementTurn(state);
  }
}

export function afterActionNobleCheck(
  state: SplendorGameState,
  player: PlayerState,
  results: ActionResultCode[],
  skipChooseNoble: boolean,
): void {
  if (!results.includes("TURN_COMPLETED")) return;
  const nobles = qualifiesForNoble(state, player);
  if (nobles.length === 0) return;
  if (skipChooseNoble) return;
  if (nobles.length === 1) {
    const noble = nobles[0]!;
    takeCardFromBoard(state, noble);
    addNoble(player, noble);
    if (player.reservedNobles.some((n) => n.id === noble.id)) {
      player.reservedNobles = player.reservedNobles.filter(
        (n) => n.id !== noble.id,
      );
    }
    return;
  }
  results.push("MUST_CHOOSE_NOBLE");
  addValidAction(state, "CHOOSE_NOBLE");
}

export function trackWinEligible(
  state: SplendorGameState,
  player: PlayerState,
  results: ActionResultCode[],
): void {
  if (results.includes("MUST_CHOOSE_NOBLE")) return;
  if (canPlayerWin(state, player) && !state.playersWhoCanWin.includes(player.name)) {
    state.playersWhoCanWin.push(player.name);
  }
}

export { burnBonuses, getPurchasedDev, getReservedDev, tokenCount };
