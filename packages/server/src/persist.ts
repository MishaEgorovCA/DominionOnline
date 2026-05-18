import type { CardId, GameState } from "@dominion/engine";
import { createRoomStore } from "@dominion/shared";

export type RoomData = {
  id: string;
  hostId: string;
  players: { id: string; name: string; seat: number | null }[];
  kingdom: CardId[] | null;
  started: boolean;
  game: GameState | null;
};

const store = createRoomStore<RoomData>("dominion");

export const loadRoom = store.load;
export const saveRoom = store.save;
export const newRoomId = store.newRoomId;
