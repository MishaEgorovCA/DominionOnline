import type { GameState, AttackContinuation, PlayerId } from "./model.js";

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

export function startMoat(s: GameState, cont: AttackContinuation): void {
  if (cont.idx >= cont.victims.length) {
    s.pending = null;
    return;
  }
  s.pending = { kind: "moat", player: cont.victims[cont.idx], attack: cont };
}
