import type { CardId } from "./cards.js";
import type { GameState, PlayerId, PlayerState } from "./model.js";
import { createSupply, validateKingdom, type PlayerCount } from "./supply.js";
import { mulberry32, shuffleInPlace } from "./rng.js";

export function createNewGame(opts: {
  playerOrder: PlayerId[];
  kingdom: CardId[];
  rngSeed?: number;
}): GameState {
  const { playerOrder, kingdom } = opts;
  if (playerOrder.length < 2 || playerOrder.length > 6) {
    throw new Error("2–6 players required");
  }
  validateKingdom(kingdom);
  const pc = playerOrder.length as PlayerCount;
  const supply = createSupply(pc, kingdom);
  let seed = opts.rngSeed ?? Date.now() >>> 0;
  const rng = mulberry32(seed);

  const players: Record<PlayerId, PlayerState> = {};
  for (const pid of playerOrder) {
    const deck: CardId[] = [];
    for (let i = 0; i < 7; i++) deck.push("copper");
    for (let i = 0; i < 3; i++) deck.push("estate");
    shuffleInPlace(deck, rng);
    seed = (seed + Math.floor(rng() * 1e9) + 1) >>> 0;
    players[pid] = {
      deck,
      hand: [],
      discard: [],
      inPlay: [],
      setAside: [],
    };
  }

  const state: GameState = {
    phase: "playing",
    rngSeed: seed,
    playerOrder,
    whoseTurn: 0,
    turnsTaken: Object.fromEntries(playerOrder.map((p) => [p, 0])),
    supply,
    trash: [],
    kingdom,
    players,
    turnPhase: "action",
    actions: 1,
    buys: 1,
    coins: 0,
    merchantsPlayedThisTurn: 0,
    firstSilverThisTurn: false,
    hasBought: false,
    pending: null,
    throneRoomDepth: 0,
  };

  for (const pid of playerOrder) {
    const p = state.players[pid];
    for (let i = 0; i < 5; i++) {
      if (p.deck.length === 0) break;
      p.hand.push(p.deck.shift()!);
    }
  }

  return state;
}
