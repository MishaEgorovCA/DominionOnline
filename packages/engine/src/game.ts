import type { CardId } from "./cards.js";
import { getCard, isActionCard, isTreasure } from "./cards.js";
import { createNewGame } from "./create.js";
import type { GameState, PlayerId } from "./model.js";
import { emptyPileCount } from "./model.js";
import { drawCards, gainCard, moveHandToPlay, countVictoryPointsForPlayer } from "./mutations.js";
import { emptyPilesToEnd, type PlayerCount } from "./supply.js";
import { handlePending } from "./pendingHandlers.js";

export { createNewGame };

export type Command =
  | { name: "play_action"; handIndex: number }
  | { name: "enter_buy_phase" }
  | { name: "play_treasure"; handIndex: number }
  | { name: "play_all_treasures" }
  | { name: "buy"; card: CardId }
  | { name: "end_turn" }
  | { name: "respond_moat"; reveal: boolean }
  | { name: "militia_discard"; handIndices: number[] }
  | { name: "bureaucrat_pick"; handIndex: number | null }
  | { name: "bandit_pick"; trashIndex: 0 | 1 | null }
  | { name: "cellar_discard"; handIndices: number[] }
  | { name: "chapel_trash"; handIndices: number[] }
  | { name: "harbinger_putback"; discardIndex: number | null }
  | { name: "library_choice"; setAside: boolean }
  | { name: "mine_pick"; handIndex: number }
  | { name: "moneylender"; trashCopper: boolean }
  | { name: "poacher_discard"; handIndices: number[] }
  | { name: "remodel_trash"; handIndex: number }
  | { name: "remodel_gain"; card: CardId }
  | { name: "sentry_resolve"; a: SentryFate; b: SentryFate; deckOrder?: [0, 1] | [1, 0] }
  | { name: "throne_room_pick"; handIndex: number }
  | { name: "vassal_play"; play: boolean }
  | { name: "workshop_gain"; card: CardId }
  | { name: "artisan_gain"; card: CardId }
  | { name: "artisan_topdeck"; handIndex: number };

export type SentryFate = "trash" | "discard" | "deck";

function clone<T>(x: T): T {
  return structuredClone(x) as T;
}

export function activePlayer(s: GameState): PlayerId {
  return s.playerOrder[s.whoseTurn];
}

export function otherPlayersInOrder(s: GameState): PlayerId[] {
  const o = s.playerOrder;
  const n = o.length;
  const cur = s.whoseTurn;
  const out: PlayerId[] = [];
  for (let k = 1; k < n; k++) out.push(o[(cur + k) % n]);
  return out;
}

export function assertTurn(s: GameState, pid: PlayerId): void {
  if (activePlayer(s) !== pid) throw new Error("Not your turn");
}

export function applyCommand(
  state: GameState,
  pid: PlayerId,
  cmd: Command,
): { state: GameState; error?: string } {
  try {
    const s = clone(state);
    if (s.phase !== "playing") return { state, error: "Game not in progress" };
    const st = s.pending
      ? handlePending(s, pid, cmd)
      : applyMain(s, pid, cmd);
    return { state: st };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { state, error: msg };
  }
}

function applyMain(s: GameState, pid: PlayerId, cmd: Command): GameState {
  switch (cmd.name) {
    case "play_action":
      return cmdPlayAction(s, pid, cmd.handIndex);
    case "enter_buy_phase":
      return cmdEnterBuy(s, pid);
    case "play_treasure":
      return cmdPlayTreasure(s, pid, cmd.handIndex);
    case "play_all_treasures":
      return cmdPlayAllTreasures(s, pid);
    case "buy":
      return cmdBuy(s, pid, cmd.card);
    case "end_turn":
      return cmdEndTurn(s, pid);
    default:
      throw new Error("Invalid command");
  }
}

export function cmdEnterBuy(s: GameState, pid: PlayerId): GameState {
  assertTurn(s, pid);
  if (s.turnPhase !== "action") throw new Error("Not in action phase");
  s.turnPhase = "buy";
  return s;
}

function cmdPlayTreasure(s: GameState, pid: PlayerId, handIndex: number): GameState {
  assertTurn(s, pid);
  if (s.turnPhase !== "buy") throw new Error("Not in buy phase");
  if (s.hasBought) throw new Error("Cannot play treasures after buying");
  const p = s.players[pid];
  const c = p.hand[handIndex];
  if (!c || !isTreasure(c)) throw new Error("Not a treasure");
  moveHandToPlay(s, pid, handIndex);
  const def = getCard(c);
  s.coins += def.treasureValue ?? 0;
  if (c === "silver" && !s.firstSilverThisTurn) {
    s.coins += s.merchantsPlayedThisTurn;
    s.firstSilverThisTurn = true;
  }
  return s;
}

function cmdPlayAllTreasures(s: GameState, pid: PlayerId): GameState {
  assertTurn(s, pid);
  if (s.turnPhase !== "buy") throw new Error("Not in buy phase");
  if (s.hasBought) throw new Error("Cannot play treasures after buying");
  const p = s.players[pid];
  for (let guard = 0; guard < 200; guard++) {
    const idx = p.hand.findIndex((c) => isTreasure(c));
    if (idx < 0) break;
    cmdPlayTreasure(s, pid, idx);
  }
  return s;
}

function cmdBuy(s: GameState, pid: PlayerId, card: CardId): GameState {
  assertTurn(s, pid);
  if (s.turnPhase !== "buy") throw new Error("Not in buy phase");
  if (s.buys <= 0) throw new Error("No buys left");
  const cost = getCard(card).cost;
  if (s.coins < cost) throw new Error("Not enough coins");
  if (s.supply[card] <= 0) throw new Error("Empty pile");
  s.coins -= cost;
  s.buys -= 1;
  s.hasBought = true;
  if (!gainCard(s, pid, card, "discard")) throw new Error("Cannot gain");
  return s;
}

function cmdEndTurn(s: GameState, pid: PlayerId): GameState {
  assertTurn(s, pid);
  if (s.turnPhase !== "buy") throw new Error("Finish buy phase (enter buy or play treasures) first");
  return cleanupAndAdvance(s, pid);
}

export function cleanupAndAdvance(s: GameState, pid: PlayerId): GameState {
  const p = s.players[pid];
  p.discard.push(...p.inPlay, ...p.hand);
  p.inPlay = [];
  p.hand = [];
  drawCards(s, pid, 5);
  s.turnsTaken[pid] = (s.turnsTaken[pid] ?? 0) + 1;
  s.actions = 1;
  s.buys = 1;
  s.coins = 0;
  s.merchantsPlayedThisTurn = 0;
  s.firstSilverThisTurn = false;
  s.hasBought = false;
  s.turnPhase = "action";
  s.whoseTurn = (s.whoseTurn + 1) % s.playerOrder.length;
  checkEndGameAfterTurn(s);
  return s;
}

function checkEndGameAfterTurn(s: GameState): void {
  const pc = s.playerOrder.length as PlayerCount;
  const provEmpty = s.supply.province <= 0;
  const empties = emptyPileCount(s.supply, s.kingdom);
  const need = emptyPilesToEnd(pc);
  if (provEmpty || empties >= need) {
    s.phase = "game_over";
    s.gameOverReason = provEmpty
      ? "Province pile empty"
      : `${need} supply piles empty`;
  }
}

export function cmdPlayAction(
  s: GameState,
  pid: PlayerId,
  handIndex: number,
): GameState {
  assertTurn(s, pid);
  if (s.turnPhase !== "action") throw new Error("Not in action phase");
  const p = s.players[pid];
  const c = p.hand[handIndex];
  if (!c || !isActionCard(c)) throw new Error("Not an action card");
  if (s.actions <= 0) throw new Error("No actions left");
  s.actions -= 1;
  moveHandToPlay(s, pid, handIndex);
  return resolveActionCard(s, pid, c);
}

import { resolveActionCard } from "./actionCards.js";

export function scoreGame(s: GameState): { player: PlayerId; vp: number; turns: number }[] {
  return s.playerOrder.map((p) => ({
    player: p,
    vp: countVictoryPointsForPlayer(p, s),
    turns: s.turnsTaken[p] ?? 0,
  }));
}

export function winner(s: GameState): PlayerId[] {
  const rows = scoreGame(s);
  const maxVp = Math.max(...rows.map((r) => r.vp));
  const top = rows.filter((r) => r.vp === maxVp);
  if (top.length === 1) return [top[0].player];
  const minTurns = Math.min(...top.map((t) => t.turns));
  const win = top.filter((t) => t.turns === minTurns);
  return win.map((w) => w.player);
}
