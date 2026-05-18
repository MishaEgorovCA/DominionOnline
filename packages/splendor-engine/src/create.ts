import { launchNewGame } from "./game.js";
import type { SplendorGameState } from "./types.js";

export function createSplendorGame(opts: {
  playerNames: string[];
  colours?: string[];
}): SplendorGameState {
  return launchNewGame(opts.playerNames, opts.colours);
}
