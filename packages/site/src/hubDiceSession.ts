const HUB_DICE_INTRO_KEY = "boardgames_hub_dice_intro";

export function hasHubDiceIntro(): boolean {
  try {
    return sessionStorage.getItem(HUB_DICE_INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHubDiceIntro(): void {
  try {
    sessionStorage.setItem(HUB_DICE_INTRO_KEY, "1");
  } catch {
    /* ignore */
  }
}
