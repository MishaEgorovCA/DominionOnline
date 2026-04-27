import type { CardId } from "@dominion/engine";

/**
 * Vite serves files from `public/` at the site root, e.g. `/cards/copper.png`.
 * Duplicate cards in the engine have no per-instance id; animations use the
 * same art by card type and pick a best-effort hand slot.
 */
const EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"] as const;

export function cardImageUrl(
  id: string,
  extIndex: number = 0,
): string {
  if (extIndex >= EXTENSIONS.length) return "";
  return `/cards/${id}${EXTENSIONS[extIndex]}`;
}

/** Face-down card back (optional user asset). */
export function cardBackImageUrl(extIndex: number = 0): string {
  if (extIndex >= EXTENSIONS.length) return "";
  return `/cards/_back${EXTENSIONS[extIndex]}`;
}

export function nextCardImageUrl(
  id: string,
  failedExt: number,
): string | null {
  const n = failedExt + 1;
  if (n < EXTENSIONS.length) return cardImageUrl(id, n);
  return null;
}

export function nextBackImageUrl(failedExt: number): string | null {
  const n = failedExt + 1;
  if (n < EXTENSIONS.length) return cardBackImageUrl(n);
  return null;
}

export function isValidCardIdForArt(id: string): id is CardId {
  return typeof id === "string" && id.length > 0;
}
