import type { SplendorGameState } from "@splendor/engine";
import { createRoomStore } from "@dominion/shared";

export type SplendorRoomData = {
  id: string;
  hostId: string;
  players: {
    id: string;
    name: string;
    seat: number | null;
    colour?: string;
  }[];
  started: boolean;
  game: SplendorGameState | null;
};

const store = createRoomStore<SplendorRoomData>("splendor");

export const loadSplendorRoom = store.load;
export const saveSplendorRoom = store.save;
export const newSplendorRoomId = store.newRoomId;
