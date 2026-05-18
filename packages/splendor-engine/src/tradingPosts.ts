import type {
  ActionResultCode,
  PlayerState,
  SplendorGameState,
  TokenMap,
  TokenType,
  TradingPowersState,
} from "./types.js";

function defaultPowers(): TradingPowersState {
  return {
    extraTokenAfterPurchase: false,
    extraTokenAfterTakingSameColor: false,
    goldTokenWorthTwoTokens: false,
    addFivePrestigePoints: false,
    addPrestigePointsWithCoatsOfArms: false,
    addFivePrestigePointsUsed: false,
    coatsPrestigeAdded: 0,
  };
}

export function createTradingPostsPlayer(
  name: string,
  colour: string,
): PlayerState {
  return {
    name,
    colour,
    prestigePoints: 0,
    tokens: {
      White: 0,
      Blue: 0,
      Green: 0,
      Red: 0,
      Brown: 0,
      Satchel: 0,
      Gold: 0,
    },
    bonuses: {
      White: 0,
      Blue: 0,
      Green: 0,
      Red: 0,
      Brown: 0,
      Satchel: 0,
      Gold: 0,
    },
    devCards: [],
    nobleCards: [],
    reservedCards: [],
    reservedNobles: [],
    coatsOfArmsUnplaced: 5,
    powers: defaultPowers(),
  };
}

function hasBonuses(
  player: PlayerState,
  req: Partial<Record<TokenType, number>>,
): boolean {
  for (const [t, need] of Object.entries(req)) {
    if ((player.bonuses[t as TokenType] ?? 0) < (need ?? 0)) return false;
  }
  return true;
}

export function unlockPowersAfterAction(
  state: SplendorGameState,
  player: PlayerState,
): void {
  if (state.gameVersion !== "BASE_ORIENT_TRADE_ROUTES") return;
  const p = player.powers ?? defaultPowers();
  player.powers = p;

  const unlock = (flag: keyof TradingPowersState, met: boolean, extra?: () => void) => {
    if (p[flag] || !met) return;
    (p[flag] as boolean) = true;
    placeCoatOfArms(player);
    extra?.();
  };

  unlock("extraTokenAfterPurchase", hasBonuses(player, { Red: 3, White: 1 }));
  unlock("extraTokenAfterTakingSameColor", hasBonuses(player, { White: 2 }));
  unlock("goldTokenWorthTwoTokens", hasBonuses(player, { Blue: 3, Brown: 1 }));
  if (
    !p.addFivePrestigePoints &&
    hasBonuses(player, { Green: 5 }) &&
    player.nobleCards.length > 0
  ) {
    p.addFivePrestigePoints = true;
    placeCoatOfArms(player);
    if (!p.addFivePrestigePointsUsed) {
      player.prestigePoints += 5;
      p.addFivePrestigePointsUsed = true;
    }
  }
  unlock("addPrestigePointsWithCoatsOfArms", hasBonuses(player, { Brown: 3 }));
}

export function maybeExtraTokenAfterPurchase(
  state: SplendorGameState,
  player: PlayerState,
  results: ActionResultCode[],
): void {
  if (state.gameVersion !== "BASE_ORIENT_TRADE_ROUTES") return;
  if (player.powers?.extraTokenAfterPurchase) {
    results.push("MUST_TAKE_EXTRA_TOKEN_AFTER_PURCHASE");
  }
}

export function placeCoatOfArms(player: PlayerState): void {
  if (player.coatsOfArmsUnplaced == null) return;
  if (player.coatsOfArmsUnplaced > 0) player.coatsOfArmsUnplaced--;
  const p = player.powers;
  if (p?.addPrestigePointsWithCoatsOfArms && player.coatsOfArmsUnplaced != null) {
    const coats = player.coatsOfArmsUnplaced;
    const add = Math.max(0, 5 - coats - (p.coatsPrestigeAdded ?? 0));
    if (add > 0) {
      player.prestigePoints += add;
      p.coatsPrestigeAdded = (p.coatsPrestigeAdded ?? 0) + add;
    }
  }
}

export function runTakeExtraTokenPower(
  state: SplendorGameState,
  player: PlayerState,
  takeToken: TokenType | undefined,
  putBackToken: TokenType | undefined,
  results: ActionResultCode[],
  addBoardTokens: (s: SplendorGameState, m: TokenMap) => void,
  removeBoardTokens: (s: SplendorGameState, m: TokenMap) => boolean,
  takeTokens: (
    p: PlayerState,
    take: TokenMap,
    put: TokenMap,
  ) => void,
): void {
  if (takeToken === putBackToken) {
    results.push("VALID_ACTION", "TURN_COMPLETED");
    state.curValidActions = state.curValidActions.filter(
      (a) => a !== "TAKE_EXTRA_TOKEN_AFTER_PURCHASE_POWER",
    );
    return;
  }
  const take: TokenMap = takeToken ? { [takeToken]: 1 } : {};
  const put: TokenMap = putBackToken ? { [putBackToken]: 1 } : {};
  let total = 0;
  const gems: TokenType[] = ["White", "Blue", "Green", "Red", "Brown", "Gold"];
  for (const t of gems) {
    total += (player.tokens[t] ?? 0) + (take[t] ?? 0) - (put[t] ?? 0);
  }
  if (total > 10) {
    results.push("MAXIMUM_TOKENS_IN_INVENTORY");
    return;
  }
  if (takeToken && (state.tokens[takeToken] ?? 0) < 1) {
    results.push("NOT_ENOUGH_TOKENS_ON_BOARD");
    return;
  }
  if (putBackToken && (player.tokens[putBackToken] ?? 0) < 1) {
    results.push("INVALID_TOKEN_CHOSEN");
    return;
  }
  removeBoardTokens(state, take);
  addBoardTokens(state, put);
  takeTokens(player, take, put);
  results.push("VALID_ACTION", "TURN_COMPLETED");
  state.curValidActions = state.curValidActions.filter(
    (a) => a !== "TAKE_EXTRA_TOKEN_AFTER_PURCHASE_POWER",
  );
}
