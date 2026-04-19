import type { CardId } from "./cards.js";
import { getCard, isActionCard } from "./cards.js";
import type { GameState, PlayerId } from "./model.js";
import { emptyPileCount } from "./model.js";
import { drawCards, gainCard, removeTopOfDeck } from "./mutations.js";
import { otherPlayersInOrder, startMoat } from "./session.js";

export function mkAttack(
  s: GameState,
  kind: "militia" | "witch" | "bureaucrat" | "bandit",
): import("./model.js").AttackContinuation {
  return { kind, victims: otherPlayersInOrder(s), idx: 0 };
}

export function resolveActionCard(s: GameState, pid: PlayerId, card: CardId): GameState {
  switch (card) {
    case "cellar":
      s.actions += 1;
      s.pending = { kind: "cellar", player: pid };
      return s;
    case "chapel":
      s.pending = { kind: "chapel", player: pid };
      return s;
    case "moat":
      drawCards(s, pid, 2);
      return s;
    case "village":
      drawCards(s, pid, 1);
      s.actions += 2;
      return s;
    case "workshop":
      s.pending = { kind: "workshop", player: pid };
      return s;
    case "smithy":
      drawCards(s, pid, 3);
      return s;
    case "moneylender":
      s.pending = { kind: "moneylender", player: pid };
      return s;
    case "remodel":
      s.pending = { kind: "remodel_trash", player: pid };
      return s;
    case "mine":
      s.pending = { kind: "mine", player: pid };
      return s;
    case "market":
      drawCards(s, pid, 1);
      s.actions += 1;
      s.buys += 1;
      s.coins += 1;
      return s;
    case "merchant":
      drawCards(s, pid, 1);
      s.actions += 1;
      s.merchantsPlayedThisTurn += 1;
      return s;
    case "festival":
      s.actions += 2;
      s.buys += 1;
      s.coins += 2;
      return s;
    case "laboratory":
      drawCards(s, pid, 2);
      s.actions += 1;
      return s;
    case "council_room":
      drawCards(s, pid, 4);
      s.buys += 1;
      for (const op of otherPlayersInOrder(s)) drawCards(s, op, 1);
      return s;
    case "harbinger":
      drawCards(s, pid, 1);
      s.actions += 1;
      s.pending = { kind: "harbinger", player: pid };
      return s;
    case "poacher":
      drawCards(s, pid, 1);
      s.actions += 1;
      s.coins += 1;
      {
        const empty = emptyPileCount(s.supply, s.kingdom);
        if (empty > 0) s.pending = { kind: "poacher", player: pid, emptyPiles: empty };
      }
      return s;
    case "library":
      continueLibrary(s, pid, []);
      return s;
    case "sentry":
      drawCards(s, pid, 1);
      s.actions += 1;
      liftSentry(s, pid);
      return s;
    case "throne_room":
      s.throneRoomDepth += 1;
      s.pending = { kind: "throne_room_pick", player: pid };
      return s;
    case "vassal": {
      s.coins += 2;
      const c = removeTopOfDeck(s, pid);
      if (!c) return s;
      if (isActionCard(c)) {
        s.pending = { kind: "vassal", player: pid, card: c };
      } else {
        s.players[pid].discard.push(c);
      }
      return s;
    }
    case "witch":
      drawCards(s, pid, 2);
      startMoat(s, mkAttack(s, "witch"));
      return s;
    case "militia":
      s.coins += 2;
      startMoat(s, mkAttack(s, "militia"));
      return s;
    case "bureaucrat":
      gainCard(s, pid, "silver", "deck_top");
      startMoat(s, mkAttack(s, "bureaucrat"));
      return s;
    case "bandit":
      gainCard(s, pid, "gold", "discard");
      startMoat(s, mkAttack(s, "bandit"));
      return s;
    case "artisan":
      s.pending = { kind: "artisan_gain", player: pid };
      return s;
    default:
      throw new Error(`Unknown action card: ${card}`);
  }
}

function liftSentry(s: GameState, pid: PlayerId): void {
  const a = removeTopOfDeck(s, pid);
  const b = removeTopOfDeck(s, pid);
  if (!a && !b) return;
  if (a && b) s.pending = { kind: "sentry", player: pid, lifted: [a, b] };
  else s.pending = { kind: "sentry", player: pid, lifted: [a ?? b!] };
}

export function continueLibrary(s: GameState, pid: PlayerId, setAside: CardId[]): void {
  const p = s.players[pid];
  if (p.hand.length >= 7) {
    p.discard.push(...setAside);
    s.pending = null;
    return;
  }
  const c = removeTopOfDeck(s, pid);
  if (!c) {
    p.discard.push(...setAside);
    s.pending = null;
    return;
  }
  if (isActionCard(c)) {
    s.pending = { kind: "library_choice", player: pid, card: c, setAside };
  } else {
    p.hand.push(c);
    continueLibrary(s, pid, setAside);
  }
}
