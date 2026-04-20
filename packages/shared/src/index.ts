/** Wire protocol + view types shared by client and server */

export type PlayerId = string;
export type RoomId = string;

export type ClientMessage =
  | { type: "join"; name: string; seatIndex?: number }
  | { type: "claimSeat"; seatIndex: number }
  | { type: "setKingdom"; kingdom: string[] }
  | { type: "randomizeKingdom" }
  | { type: "shuffleSeats" }
  | { type: "startGame" }
  | { type: "command"; command: EngineCommand };

export type ServerMessage =
  | { type: "error"; message: string }
  | { type: "room"; room: RoomSnapshot }
  | { type: "game"; game: GameView };

export type RoomSnapshot = {
  roomId: RoomId;
  hostId: PlayerId;
  players: { id: PlayerId; name: string; seatIndex: number | null }[];
  kingdom: string[] | null;
  started: boolean;
};

/** Opaque command forwarded to engine — see @dominion/engine */
export type EngineCommand = Record<string, unknown> & { name: string };

export type GameView = {
  /** Serialized engine state + per-player private hand */
  state: unknown;
  you: PlayerId | null;
  /** Your hand card ids; only present for your seat */
  yourHand?: string[];
};
