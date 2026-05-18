const CANONICAL_KEY = "boardgames_display_name";
const LEGACY_KEYS = ["dominion_display_name", "splendor_display_name"] as const;

export function getDisplayName(): string {
  try {
    const canonical = localStorage.getItem(CANONICAL_KEY)?.trim();
    if (canonical) return canonical;

    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key)?.trim();
      if (legacy) {
        localStorage.setItem(CANONICAL_KEY, legacy);
        localStorage.removeItem(key);
        return legacy;
      }
    }
  } catch {
    /* ignore */
  }
  return "Player";
}

export function setDisplayName(name: string): void {
  try {
    const trimmed = name.trim() || "Player";
    localStorage.setItem(CANONICAL_KEY, trimmed);
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
