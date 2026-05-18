import {
  addBoardTokens,
  addValidAction,
  checkForWin,
  clearValidActions,
  getCardFromId,
  getCurrentPlayer,
  getPlayerByName,
  incrementTurn,
  qualifiesForNoble,
  removeBoardTokens,
  removeValidAction,
  takeCardFromBoard,
  trackWinEligible,
} from "./game.js";
import {
  addDevCard,
  addNoble,
  addTokens,
  burnBonuses,
  getPurchasedDev,
  getReservedDev,
  removeTokens,
  takeTokens,
  tokenCount,
} from "./player.js";
import { canBuySatchel, isPurchasable, setSatchelTokenType } from "./purchasable.js";
import type {
  ActionResultCode,
  DevelopmentCard,
  NobleCard,
  PlayerState,
  SplendorAction,
  SplendorGameState,
  TokenMap,
  TokenType,
} from "./types.js";

function gemTypes(): TokenType[] {
  return ["White", "Blue", "Green", "Red", "Brown"];
}

export function decodeAction(raw: {
  action: string;
  payload?: Record<string, unknown>;
}): SplendorAction {
  const p = raw.payload ?? {};
  switch (raw.action) {
    case "BUY_CARD":
      return {
        action: "BUY_CARD",
        cardId: String(p.cardId ?? ""),
        selectedTokens: (p.selectedTokens as TokenMap) ?? {},
      };
    case "TAKE_TOKEN":
      return {
        action: "TAKE_TOKEN",
        takeTokens: (p.takeTokens as TokenMap) ?? {},
        putBackTokens: (p.putBackTokens as TokenMap) ?? {},
      };
    case "RESERVE_CARD":
      return { action: "RESERVE_CARD", cardId: String(p.cardId ?? "") };
    case "CHOOSE_NOBLE":
      return { action: "CHOOSE_NOBLE", cardId: String(p.cardId ?? "") };
    case "CASCADE_1":
      return { action: "CASCADE_1", cardId: String(p.cardId ?? "") };
    case "CASCADE_2":
      return { action: "CASCADE_2", cardId: String(p.cardId ?? "") };
    case "RESERVE_NOBLE":
      return { action: "RESERVE_NOBLE", cardId: String(p.cardId ?? "") };
    case "CHOOSE_SATCHEL_TOKEN":
      return {
        action: "CHOOSE_SATCHEL_TOKEN",
        cardId: String(p.cardId ?? ""),
        selected: p.selected as TokenType,
      };
    default:
      throw new Error(`Unknown action: ${raw.action}`);
  }
}

function runTakeToken(
  state: SplendorGameState,
  player: PlayerState,
  takeTokensMap: TokenMap,
  putBackTokensMap: TokenMap,
  results: ActionResultCode[],
): void {
  let playerTotal = 0;
  for (const t of gemTypes()) {
    const take = takeTokensMap[t] ?? 0;
    const put = putBackTokensMap[t] ?? 0;
    playerTotal += (player.tokens[t] ?? 0) + take - put;
    if (take === 0 && put === 0) continue;
    const left = (state.tokens[t] ?? 0) - take + put;
    if (left < 0) {
      results.push("NOT_ENOUGH_TOKENS_ON_BOARD");
      return;
    }
    if (put > (player.tokens[t] ?? 0)) {
      results.push("NOT_ENOUGH_TOKENS_IN_INVENTORY");
      return;
    }
  }
  if (playerTotal > 10) {
    results.push("MAXIMUM_TOKENS_IN_INVENTORY");
    return;
  }

  let unique = 0;
  let doubles = 0;
  for (const t of gemTypes()) {
    const n = takeTokensMap[t] ?? 0;
    if (n > 2) {
      results.push("INVALID_TOKENS_GIVEN");
      return;
    }
    if (n === 2) {
      doubles++;
      if ((state.tokens[t] ?? 0) < 4) {
        results.push("INVALID_TOKENS_GIVEN");
        return;
      }
    } else if (n > 0) unique++;
  }
  if (doubles > 1 || unique > 3 || (unique > 0 && doubles > 0)) {
    results.push("INVALID_TOKENS_GIVEN");
    return;
  }

  removeBoardTokens(state, takeTokensMap);
  addBoardTokens(state, putBackTokensMap);
  takeTokens(player, takeTokensMap, putBackTokensMap);
  if (state.curValidActions.includes("TAKE_TOKEN")) results.push("VALID_ACTION");
  results.push("TURN_COMPLETED");
  clearValidActions(state);
}

function applyDevCard(
  state: SplendorGameState,
  player: PlayerState,
  dc: DevelopmentCard,
  results: ActionResultCode[],
  fromBuy: boolean,
): void {
  if (dc.tokenType && dc.tokenType !== "Satchel") {
    player.bonuses[dc.tokenType] = (player.bonuses[dc.tokenType] ?? 0) + dc.bonus;
  }
  player.prestigePoints += dc.prestigePoints;

  if (dc.costType === "Bonus") {
    burnBonuses(player, dc.tokenCost);
  }

  if (dc.orient) {
    if (dc.orient.reserveNoble && state.nobles.visible.length > 0) {
      results.push("MUST_RESERVE_NOBLE");
      addValidAction(state, "RESERVE_NOBLE");
    }
    if (dc.orient.cascadeType === "Tier1") {
      if (
        state.tier1.visible.length > 0 ||
        state.tier1Orient.visible.length > 0
      ) {
        results.push("MUST_CHOOSE_CASCADE_CARD_TIER_1");
        addValidAction(state, "CASCADE_1");
      }
    } else if (dc.orient.cascadeType === "Tier2") {
      if (
        state.tier2.visible.length > 0 ||
        state.tier2Orient.visible.length > 0
      ) {
        results.push("MUST_CHOOSE_CASCADE_CARD_TIER_2");
        addValidAction(state, "CASCADE_2");
      }
    }
    if (dc.tokenType === "Satchel") {
      results.push("MUST_CHOOSE_TOKEN_TYPE");
      addValidAction(state, "CHOOSE_SATCHEL_TOKEN");
    }
  }

  if (fromBuy && results.length === 0) {
    results.push("TURN_COMPLETED");
  }
}

function runBuyCard(
  state: SplendorGameState,
  player: PlayerState,
  cardId: string,
  selectedTokens: TokenMap,
  results: ActionResultCode[],
): void {
  let dc = getCardFromId(state, cardId) as DevelopmentCard | undefined;
  let wasReserved = false;
  if (!dc) {
    dc = getReservedDev(player, cardId);
    wasReserved = !!dc;
  }
  if (!dc) throw new Error(`Card with id '${cardId}' does not exist.`);

  if (dc.tokenType === "Satchel" && !canBuySatchel(player)) {
    throw new Error(
      "Cannot purchase satchel without another purchased card with a bonus.",
    );
  }

  if (!isPurchasable(dc, player, selectedTokens)) {
    results.push("INVALID_TOKENS_GIVEN");
    return;
  }

  addDevCard(player, dc);
  if (wasReserved) {
    player.reservedCards = player.reservedCards.filter((c) => c.id !== dc!.id);
  } else {
    takeCardFromBoard(state, dc);
  }
  addBoardTokens(state, selectedTokens);
  removeTokens(player, selectedTokens);

  if (state.curValidActions.includes("BUY_CARD")) results.push("VALID_ACTION");
  clearValidActions(state);
  applyDevCard(state, player, dc, results, true);
}

function runReserveCard(
  state: SplendorGameState,
  player: PlayerState,
  cardId: string,
  results: ActionResultCode[],
): void {
  const dc = getCardFromId(state, cardId) as DevelopmentCard | undefined;
  if (!dc) throw new Error(`Card with id '${cardId}' does not exist.`);
  if (player.reservedCards.length >= 3) {
    results.push("MAXIMUM_CARDS_RESERVED");
    return;
  }
  takeCardFromBoard(state, dc);
  player.reservedCards.push(dc);
  if (tokenCount(player) < 10) {
    const gold: TokenMap = { Gold: 1 };
    if (removeBoardTokens(state, gold)) addTokens(player, gold);
  }
  if (state.curValidActions.includes("RESERVE_CARD")) results.push("VALID_ACTION");
  results.push("TURN_COMPLETED");
  clearValidActions(state);
}

function runChooseNoble(
  state: SplendorGameState,
  player: PlayerState,
  nobleId: string,
  results: ActionResultCode[],
): void {
  const qualifying = qualifiesForNoble(state, player);
  const nc = qualifying.find((n) => n.id === nobleId);
  if (!nc) throw new Error(`Noble '${nobleId}' not available.`);
  const wasReserved = player.reservedNobles.some((n) => n.id === nobleId);
  takeCardFromBoard(state, nc);
  addNoble(player, nc);
  if (wasReserved) {
    player.reservedNobles = player.reservedNobles.filter((n) => n.id !== nobleId);
  }
  if (state.curValidActions.includes("CHOOSE_NOBLE")) results.push("VALID_ACTION");
  results.push("TURN_COMPLETED");
  removeValidAction(state, "CHOOSE_NOBLE");
}

function runCascade(
  state: SplendorGameState,
  player: PlayerState,
  cardId: string,
  results: ActionResultCode[],
): void {
  const dc = getCardFromId(state, cardId) as DevelopmentCard | undefined;
  if (!dc) throw new Error(`Card with id '${cardId}' does not exist.`);
  addDevCard(player, dc);
  takeCardFromBoard(state, dc);
  const action = state.curValidActions.includes("CASCADE_1")
    ? "CASCADE_1"
    : "CASCADE_2";
  if (state.curValidActions.includes(action)) results.push("VALID_ACTION");
  results.push("TURN_COMPLETED");
  removeValidAction(state, action);
  applyDevCard(state, player, dc, results, false);
}

function runReserveNoble(
  state: SplendorGameState,
  player: PlayerState,
  nobleId: string,
  results: ActionResultCode[],
): void {
  const nc = getCardFromId(state, nobleId) as NobleCard | undefined;
  if (!nc) throw new Error(`Noble '${nobleId}' does not exist.`);
  takeCardFromBoard(state, nc);
  player.reservedNobles.push(nc);
  if (state.curValidActions.includes("RESERVE_NOBLE")) results.push("VALID_ACTION");
  results.push("TURN_COMPLETED");
  removeValidAction(state, "RESERVE_NOBLE");
}

function runChooseSatchel(
  state: SplendorGameState,
  player: PlayerState,
  cardId: string,
  selected: TokenType,
  results: ActionResultCode[],
): void {
  const devCard = getPurchasedDev(player, cardId);
  if (!devCard || devCard.tokenType !== "Satchel") {
    throw new Error(`Card '${cardId}' is not a satchel.`);
  }
  const valid = player.devCards.some(
    (c) =>
      c.tokenType &&
      c.tokenType !== "Satchel" &&
      c.tokenType !== "Gold" &&
      c.tokenType === selected,
  );
  if (!valid) {
    results.push("INVALID_TOKEN_CHOSEN");
    return;
  }
  setSatchelTokenType(devCard, selected);
  player.bonuses[selected] = (player.bonuses[selected] ?? 0) + 1;
  results.push("TURN_COMPLETED");
  if (state.curValidActions.includes("CHOOSE_SATCHEL_TOKEN")) {
    results.push("VALID_ACTION");
  }
  removeValidAction(state, "CHOOSE_SATCHEL_TOKEN");
}

export function runAction(
  state: SplendorGameState,
  playerName: string,
  act: SplendorAction,
): { results: ActionResultCode[]; error?: string } {
  const player = getPlayerByName(state, playerName);
  if (!player) return { results: ["INVALID_PLAYER"] };
  if (getCurrentPlayer(state).name !== playerName) {
    return { results: ["INVALID_PLAYER"] };
  }
  if (!state.curValidActions.includes(act.action)) {
    return { results: [], error: `Action ${act.action} is not valid now.` };
  }

  const results: ActionResultCode[] = [];
  const hadMain = ["BUY_CARD", "TAKE_TOKEN", "RESERVE_CARD"].includes(act.action);

  try {
    switch (act.action) {
      case "TAKE_TOKEN":
        runTakeToken(state, player, act.takeTokens, act.putBackTokens, results);
        break;
      case "BUY_CARD":
        runBuyCard(state, player, act.cardId, act.selectedTokens, results);
        break;
      case "RESERVE_CARD":
        runReserveCard(state, player, act.cardId, results);
        break;
      case "CHOOSE_NOBLE":
        runChooseNoble(state, player, act.cardId, results);
        break;
      case "CASCADE_1":
      case "CASCADE_2":
        runCascade(state, player, act.cardId, results);
        break;
      case "RESERVE_NOBLE":
        runReserveNoble(state, player, act.cardId, results);
        break;
      case "CHOOSE_SATCHEL_TOKEN":
        runChooseSatchel(state, player, act.cardId, act.selected, results);
        break;
    }
  } catch (e) {
    return { results, error: e instanceof Error ? e.message : String(e) };
  }

  if (
    results.includes("TURN_COMPLETED") &&
    hadMain &&
    !results.includes("MUST_CHOOSE_NOBLE")
  ) {
    const nobles = qualifiesForNoble(state, player);
    if (nobles.length > 1) {
      results.push("MUST_CHOOSE_NOBLE");
      addValidAction(state, "CHOOSE_NOBLE");
    } else if (nobles.length === 1) {
      const n = nobles[0]!;
      takeCardFromBoard(state, n);
      addNoble(player, n);
      player.reservedNobles = player.reservedNobles.filter((x) => x.id !== n.id);
    }
    trackWinEligible(state, player, results);
  }

  const pending = results.some((r) => r.startsWith("MUST_"));
  if (
    results.includes("TURN_COMPLETED") &&
    state.curValidActions.length === 0 &&
    !pending
  ) {
    if (!checkForWin(state)) incrementTurn(state);
  } else if (
    results.includes("TURN_COMPLETED") &&
    results.includes("VALID_ACTION") &&
    state.curValidActions.length === 0 &&
    !pending
  ) {
    if (!checkForWin(state)) incrementTurn(state);
  }

  const errResult = results.find(
    (r) =>
      r !== "VALID_ACTION" &&
      r !== "TURN_COMPLETED" &&
      !r.startsWith("MUST_"),
  );
  if (errResult && !results.includes("VALID_ACTION")) {
    return { results, error: errResult };
  }

  return { results };
}
