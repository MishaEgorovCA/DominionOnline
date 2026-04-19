import type { CardId } from "./cards.js";

export type PlayerId = string;

export type GamePhase = "lobby" | "playing" | "game_over";

export type TurnPhase = "action" | "buy" | "cleanup";

export type AttackKind = "militia" | "witch" | "bureaucrat" | "bandit";

export type AttackContinuation = {
  kind: AttackKind;
  victims: PlayerId[];
  idx: number;
};

export type PendingPrompt =
  | {
      kind: "moat";
      player: PlayerId;
      attack: AttackContinuation;
    }
  | {
      kind: "militia_discard";
      player: PlayerId;
      victims: PlayerId[];
      victimIdx: number;
    }
  | {
      kind: "bureaucrat_react";
      player: PlayerId;
      cont: AttackContinuation;
    }
  | {
      kind: "bandit_react";
      victim: PlayerId;
      lifted: CardId[];
      cont: AttackContinuation;
    }
  | {
      kind: "cellar";
      player: PlayerId;
    }
  | {
      kind: "chapel";
      player: PlayerId;
    }
  | {
      kind: "harbinger";
      player: PlayerId;
    }
  | {
      kind: "library_choice";
      player: PlayerId;
      card: CardId;
      setAside: CardId[];
    }
  | {
      kind: "mine";
      player: PlayerId;
    }
  | {
      kind: "moneylender";
      player: PlayerId;
    }
  | {
      kind: "poacher";
      player: PlayerId;
      emptyPiles: number;
    }
  | {
      kind: "remodel_trash";
      player: PlayerId;
    }
  | {
      kind: "remodel_gain";
      player: PlayerId;
      trashedCost: number;
    }
  | {
      kind: "sentry";
      player: PlayerId;
      lifted: CardId[];
    }
  | {
      kind: "throne_room_pick";
      player: PlayerId;
    }
  | {
      kind: "vassal";
      player: PlayerId;
      card: CardId;
    }
  | {
      kind: "workshop";
      player: PlayerId;
    }
  | {
      kind: "artisan_gain";
      player: PlayerId;
    }
  | {
      kind: "artisan_topdeck";
      player: PlayerId;
    };

export interface PlayerState {
  deck: CardId[];
  hand: CardId[];
  discard: CardId[];
  inPlay: CardId[];
  setAside: CardId[];
}

export interface GameState {
  phase: GamePhase;
  rngSeed: number;
  playerOrder: PlayerId[];
  whoseTurn: number;
  turnsTaken: Record<PlayerId, number>;
  supply: Record<CardId, number>;
  trash: CardId[];
  kingdom: CardId[];
  players: Record<PlayerId, PlayerState>;
  turnPhase: TurnPhase;
  actions: number;
  buys: number;
  coins: number;
  merchantsPlayedThisTurn: number;
  firstSilverThisTurn: boolean;
  hasBought: boolean;
  pending: PendingPrompt | null;
  throneRoomDepth: number;
  gameOverReason?: string;
  gameEndingPending?: boolean;
}

export function emptyPileCount(supply: Record<CardId, number>, _kingdom: CardId[]): number {
  let n = 0;
  for (const k of Object.keys(supply) as CardId[]) {
    if (supply[k] === 0) n++;
  }
  return n;
}
