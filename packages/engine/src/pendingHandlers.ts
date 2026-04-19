import type { CardId } from "./cards.js";
import { getCard, isActionCard, isTreasure, isVictory } from "./cards.js";
import type { Command } from "./game.js";
import type {
  AttackContinuation,
  GameState,
  PendingPrompt,
  PlayerId,
} from "./model.js";
import { startMoat } from "./session.js";
import {
  discardFromHand,
  drawCards,
  gainCard,
  trashFromHand,
  moveHandToPlay,
} from "./mutations.js";
import { resolveActionCard, continueLibrary } from "./actionCards.js";
import { removeTopOfDeck } from "./mutations.js";

export function handlePending(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
): GameState {
  const pend = s.pending;
  if (!pend) throw new Error("No pending prompt");

  switch (pend.kind) {
    case "moat":
      return handleMoat(s, pid, cmd, pend);
    case "militia_discard":
      return handleMilitiaDiscard(s, pid, cmd, pend);
    case "bureaucrat_react":
      return handleBureaucrat(s, pid, cmd, pend);
    case "bandit_react":
      return handleBandit(s, pid, cmd, pend);
    case "cellar":
      return handleCellar(s, pid, cmd, pend);
    case "chapel":
      return handleChapel(s, pid, cmd, pend);
    case "harbinger":
      return handleHarbinger(s, pid, cmd, pend);
    case "library_choice":
      return handleLibrary(s, pid, cmd, pend);
    case "mine":
      return handleMine(s, pid, cmd, pend);
    case "moneylender":
      return handleMoneylender(s, pid, cmd, pend);
    case "poacher":
      return handlePoacher(s, pid, cmd, pend);
    case "remodel_trash":
      return handleRemodelTrash(s, pid, cmd, pend);
    case "remodel_gain":
      return handleRemodelGain(s, pid, cmd, pend);
    case "sentry":
      return handleSentry(s, pid, cmd, pend);
    case "throne_room_pick":
      return handleThronePick(s, pid, cmd, pend);
    case "vassal":
      return handleVassal(s, pid, cmd, pend);
    case "workshop":
      return handleWorkshop(s, pid, cmd, pend);
    case "artisan_gain":
      return handleArtisanGain(s, pid, cmd, pend);
    case "artisan_topdeck":
      return handleArtisanTop(s, pid, cmd, pend);
    default:
      throw new Error(`Unhandled pending ${(pend as PendingPrompt).kind}`);
  }
}

function advanceAttackAfterVictim(s: GameState, cont: AttackContinuation): void {
  cont.idx += 1;
  startMoat(s, cont);
}

function handleMoat(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "moat" }>,
): GameState {
  if (cmd.name !== "respond_moat") throw new Error("Expected moat response");
  if (pid !== pend.player) throw new Error("Wrong player");
  const cont = pend.attack;
  const victim = cont.victims[cont.idx];
  if (cmd.reveal) {
    if (!s.players[victim].hand.includes("moat")) throw new Error("No Moat to reveal");
    advanceAttackAfterVictim(s, cont);
    return s;
  }
  if (cont.kind === "witch") {
    if (s.supply.curse > 0) gainCard(s, victim, "curse", "discard");
    advanceAttackAfterVictim(s, cont);
    return s;
  }
  if (cont.kind === "militia") {
    s.pending = {
      kind: "militia_discard",
      player: victim,
      victims: cont.victims,
      victimIdx: cont.idx,
    };
    return s;
  }
  if (cont.kind === "bureaucrat") {
    s.pending = { kind: "bureaucrat_react", player: victim, cont };
    return s;
  }
  if (cont.kind === "bandit") {
    banditVictim(s, victim, cont);
    return s;
  }
  return s;
}

function removeTwoFromDeck(s: GameState, victim: PlayerId): CardId[] {
  const a = removeTopOfDeck(s, victim);
  const b = removeTopOfDeck(s, victim);
  const out: CardId[] = [];
  if (a) out.push(a);
  if (b) out.push(b);
  return out;
}

function banditVictim(s: GameState, victim: PlayerId, cont: AttackContinuation): void {
  const lifted = removeTwoFromDeck(s, victim);
  if (lifted.length === 0) {
    advanceAttackAfterVictim(s, cont);
    return;
  }
  if (lifted.length === 1) {
    const c = lifted[0];
    if (isTreasure(c) && c !== "copper") {
      s.trash.push(c);
    } else {
      s.players[victim].discard.push(c);
    }
    advanceAttackAfterVictim(s, cont);
    return;
  }
  const [c0, c1] = lifted as [CardId, CardId];
  const t0 = isTreasure(c0) && c0 !== "copper";
  const t1 = isTreasure(c1) && c1 !== "copper";
  if (!t0 && !t1) {
    s.players[victim].discard.push(c0, c1);
    advanceAttackAfterVictim(s, cont);
    return;
  }
  if (t0 && !t1) {
    s.trash.push(c0);
    s.players[victim].discard.push(c1);
    advanceAttackAfterVictim(s, cont);
    return;
  }
  if (!t0 && t1) {
    s.trash.push(c1);
    s.players[victim].discard.push(c0);
    advanceAttackAfterVictim(s, cont);
    return;
  }
  s.pending = { kind: "bandit_react", victim, lifted: [c0, c1], cont };
}

function handleBandit(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "bandit_react" }>,
): GameState {
  if (cmd.name !== "bandit_pick") throw new Error("Expected bandit pick");
  if (pid !== pend.victim) throw new Error("Wrong player");
  const [c0, c1] = pend.lifted;
  const t0 = isTreasure(c0) && c0 !== "copper";
  const t1 = isTreasure(c1) && c1 !== "copper";
  if (!t0 || !t1) throw new Error("Invalid bandit state");
  if (cmd.trashIndex === null) throw new Error("Choose treasure to trash");
  const trashI = cmd.trashIndex;
  const keepI = 1 - trashI;
  s.trash.push(pend.lifted[trashI]);
  s.players[pend.victim].discard.push(pend.lifted[keepI]);
  advanceAttackAfterVictim(s, pend.cont);
  return s;
}

function handleMilitiaDiscard(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "militia_discard" }>,
): GameState {
  if (cmd.name !== "militia_discard") throw new Error("Expected militia discard");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  if (p.hand.length <= 3) {
    const cont: AttackContinuation = {
      kind: "militia",
      victims: pend.victims,
      idx: pend.victimIdx + 1,
    };
    startMoat(s, cont);
    return s;
  }
  const need = p.hand.length - 3;
  const idxs = [...cmd.handIndices].sort((a, b) => b - a);
  if (idxs.length !== need) throw new Error(`Discard exactly ${need} cards`);
  const seen = new Set<number>();
  for (const i of idxs) {
    if (i < 0 || i >= p.hand.length || seen.has(i)) throw new Error("Bad indices");
    seen.add(i);
  }
  for (const i of idxs) discardFromHand(s, pid, i);
  const cont: AttackContinuation = {
    kind: "militia",
    victims: pend.victims,
    idx: pend.victimIdx + 1,
  };
  startMoat(s, cont);
  return s;
}

function handleBureaucrat(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "bureaucrat_react" }>,
): GameState {
  if (cmd.name !== "bureaucrat_pick") throw new Error("Expected bureaucrat pick");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  const victories = p.hand
    .map((c, i) => (isVictory(c) ? i : -1))
    .filter((i) => i >= 0);
  if (victories.length === 0) {
    if (cmd.handIndex !== null) throw new Error("No victory in hand");
  } else {
    if (cmd.handIndex === null) throw new Error("Pick a victory card");
    const c = p.hand[cmd.handIndex];
    if (!c || !isVictory(c)) throw new Error("Not a victory card");
    p.hand.splice(cmd.handIndex, 1);
    p.deck.unshift(c);
  }
  advanceAttackAfterVictim(s, pend.cont);
  return s;
}

function handleCellar(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "cellar" }>,
): GameState {
  if (cmd.name !== "cellar_discard") throw new Error("Expected cellar_discard");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  const idxs = [...cmd.handIndices].sort((a, b) => b - a);
  for (const i of idxs) {
    if (i < 0 || i >= p.hand.length) throw new Error("Bad index");
  }
  for (const i of idxs) discardFromHand(s, pid, i);
  drawCards(s, pid, idxs.length);
  s.pending = null;
  return s;
}

function handleChapel(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "chapel" }>,
): GameState {
  if (cmd.name !== "chapel_trash") throw new Error("Expected chapel_trash");
  if (pid !== pend.player) throw new Error("Wrong player");
  if (cmd.handIndices.length > 4) throw new Error("Trash at most 4");
  const idxs = [...cmd.handIndices].sort((a, b) => b - a);
  const seen = new Set<number>();
  for (const i of idxs) {
    if (i < 0 || i >= s.players[pid].hand.length || seen.has(i)) throw new Error("Bad index");
    seen.add(i);
  }
  for (const i of idxs) trashFromHand(s, pid, i);
  s.pending = null;
  return s;
}

function handleHarbinger(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "harbinger" }>,
): GameState {
  if (cmd.name !== "harbinger_putback") throw new Error("Expected harbinger_putback");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  if (cmd.discardIndex === null) {
    s.pending = null;
    return s;
  }
  const c = p.discard[cmd.discardIndex];
  if (!c) throw new Error("Bad discard index");
  p.discard.splice(cmd.discardIndex, 1);
  p.deck.unshift(c);
  s.pending = null;
  return s;
}

function handleLibrary(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "library_choice" }>,
): GameState {
  if (cmd.name !== "library_choice") throw new Error("Expected library_choice");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  const card = pend.card;
  if (cmd.setAside) {
    continueLibrary(s, pid, [...pend.setAside, card]);
  } else {
    p.hand.push(card);
    continueLibrary(s, pid, pend.setAside);
  }
  return s;
}

function handleMine(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "mine" }>,
): GameState {
  if (cmd.name !== "mine_pick") throw new Error("Expected mine_pick");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  const c = p.hand[cmd.handIndex];
  if (!c || !isTreasure(c)) throw new Error("Pick a treasure from hand");
  trashFromHand(s, pid, cmd.handIndex);
  s.pending = null;
  let gain: CardId | null = null;
  if (c === "copper") gain = "silver";
  else if (c === "silver") gain = "gold";
  if (gain && s.supply[gain] > 0) gainCard(s, pid, gain, "hand");
  return s;
}

function handleMoneylender(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "moneylender" }>,
): GameState {
  if (cmd.name !== "moneylender") throw new Error("Expected moneylender");
  if (pid !== pend.player) throw new Error("Wrong player");
  if (cmd.trashCopper) {
    const i = s.players[pid].hand.indexOf("copper");
    if (i < 0) throw new Error("No copper");
    trashFromHand(s, pid, i);
    s.coins += 3;
  }
  s.pending = null;
  return s;
}

function handlePoacher(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "poacher" }>,
): GameState {
  if (cmd.name !== "poacher_discard") throw new Error("Expected poacher_discard");
  if (pid !== pend.player) throw new Error("Wrong player");
  const n = pend.emptyPiles;
  const p = s.players[pid];
  if (cmd.handIndices.length !== n) throw new Error(`Discard ${n} cards`);
  const idxs = [...cmd.handIndices].sort((a, b) => b - a);
  const seen = new Set<number>();
  for (const i of idxs) {
    if (i < 0 || i >= p.hand.length || seen.has(i)) throw new Error("Bad index");
    seen.add(i);
  }
  for (const i of idxs) discardFromHand(s, pid, i);
  s.pending = null;
  return s;
}

function handleRemodelTrash(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "remodel_trash" }>,
): GameState {
  if (cmd.name !== "remodel_trash") throw new Error("Expected remodel_trash");
  if (pid !== pend.player) throw new Error("Wrong player");
  const c = trashFromHand(s, pid, cmd.handIndex);
  if (!c) throw new Error("Bad hand index");
  const cost = getCard(c).cost;
  s.pending = { kind: "remodel_gain", player: pid, trashedCost: cost };
  return s;
}

function handleRemodelGain(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "remodel_gain" }>,
): GameState {
  if (cmd.name !== "remodel_gain") throw new Error("Expected remodel_gain");
  if (pid !== pend.player) throw new Error("Wrong player");
  const card = cmd.card;
  if (s.supply[card] <= 0) throw new Error("Empty pile");
  const cost = getCard(card).cost;
  if (cost > pend.trashedCost + 2) throw new Error("Costs too much");
  gainCard(s, pid, card, "discard");
  s.pending = null;
  return s;
}

function handleSentry(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "sentry" }>,
): GameState {
  if (cmd.name !== "sentry_resolve") throw new Error("Expected sentry_resolve");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  const lifted = pend.lifted;
  const c0 = lifted[0];
  const c1 = lifted[1];

  if (lifted.length === 1) {
    if (cmd.a === "trash") s.trash.push(c0);
    else if (cmd.a === "discard") p.discard.push(c0);
    else p.deck.unshift(c0);
    s.pending = null;
    return s;
  }

  const f0 = cmd.a;
  const f1 = cmd.b;
  if (f0 === "trash") s.trash.push(c0);
  else if (f0 === "discard") p.discard.push(c0);
  if (f1 === "trash") s.trash.push(c1);
  else if (f1 === "discard") p.discard.push(c1);

  const d0 = f0 === "deck";
  const d1 = f1 === "deck";
  if (d0 && d1) {
    const ord = cmd.deckOrder;
    if (!ord) throw new Error("deckOrder required when both return to deck");
    const top = ord[0] === 0 ? c0 : c1;
    const bottom = ord[0] === 0 ? c1 : c0;
    p.deck.unshift(bottom);
    p.deck.unshift(top);
  } else if (d0) {
    p.deck.unshift(c0);
  } else if (d1) {
    p.deck.unshift(c1);
  }
  s.pending = null;
  return s;
}

function handleThronePick(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "throne_room_pick" }>,
): GameState {
  if (cmd.name !== "throne_room_pick") throw new Error("Expected throne_room_pick");
  if (pid !== pend.player) throw new Error("Wrong player");
  const st = structuredClone(s) as GameState;
  const p = st.players[pid];
  const card = p.hand[cmd.handIndex];
  if (!card || !isActionCard(card)) throw new Error("Pick an action card");
  p.hand.splice(cmd.handIndex, 1);
  resolveActionCard(st, pid, card);
  if (st.pending) {
    throw new Error(
      "Throne Room cannot resolve this card (pending prompts) — choose a simpler action",
    );
  }
  resolveActionCard(st, pid, card);
  if (st.pending) throw new Error("Throne Room second resolution failed");
  p.inPlay.push(card);
  st.throneRoomDepth = Math.max(0, st.throneRoomDepth - 1);
  st.pending = null;
  return st;
}

function handleVassal(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "vassal" }>,
): GameState {
  if (cmd.name !== "vassal_play") throw new Error("Expected vassal_play");
  if (pid !== pend.player) throw new Error("Wrong player");
  const card = pend.card;
  s.pending = null;
  if (cmd.play) {
    s.players[pid].inPlay.push(card);
    resolveActionCard(s, pid, card);
  } else {
    s.players[pid].discard.push(card);
  }
  return s;
}

function handleWorkshop(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "workshop" }>,
): GameState {
  if (cmd.name !== "workshop_gain") throw new Error("Expected workshop_gain");
  if (pid !== pend.player) throw new Error("Wrong player");
  const card = cmd.card;
  if (getCard(card).cost > 4) throw new Error("Costs too much");
  if (!gainCard(s, pid, card, "discard")) throw new Error("Cannot gain");
  s.pending = null;
  return s;
}

function handleArtisanGain(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "artisan_gain" }>,
): GameState {
  if (cmd.name !== "artisan_gain") throw new Error("Expected artisan_gain");
  if (pid !== pend.player) throw new Error("Wrong player");
  const card = cmd.card;
  if (getCard(card).cost > 5) throw new Error("Costs too much");
  if (!gainCard(s, pid, card, "hand")) throw new Error("Cannot gain");
  s.pending = { kind: "artisan_topdeck", player: pid };
  return s;
}

function handleArtisanTop(
  s: GameState,
  pid: PlayerId,
  cmd: Command,
  pend: Extract<PendingPrompt, { kind: "artisan_topdeck" }>,
): GameState {
  if (cmd.name !== "artisan_topdeck") throw new Error("Expected artisan_topdeck");
  if (pid !== pend.player) throw new Error("Wrong player");
  const p = s.players[pid];
  const c = p.hand[cmd.handIndex];
  if (!c) throw new Error("Bad index");
  p.hand.splice(cmd.handIndex, 1);
  p.deck.unshift(c);
  s.pending = null;
  return s;
}
