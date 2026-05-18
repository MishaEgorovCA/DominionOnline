import { launchNewGame } from "./game.js";
import type { SplendorGameState, SplendorGameVersion } from "./types.js";

export function createSplendorGame(opts: {
  playerNames: string[];
  colours?: string[];
  version?: SplendorGameVersion;
}): SplendorGameState {
  return launchNewGame(
    opts.playerNames,
    opts.colours,
    opts.version ?? "BASE_ORIENT",
  );
}
