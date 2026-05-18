import { decodeAction, runAction } from "./actions.js";
import type { SplendorGameState } from "./types.js";

export function applySplendorAction(
  state: SplendorGameState,
  playerName: string,
  raw: { action: string; payload?: Record<string, unknown> },
): { state: SplendorGameState; error?: string } {
  const act = decodeAction(raw);
  const next = structuredClone(state);
  const { error } = runAction(next, playerName, act);
  if (error) return { state, error };
  return { state: next };
}
