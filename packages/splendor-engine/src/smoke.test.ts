import { describe, expect, it } from "vitest";
import { applySplendorAction, createSplendorGame } from "./index.js";

describe("splendor engine smoke", () => {
  it("creates a 2-player orient game", () => {
    const g = createSplendorGame({
      playerNames: ["Alice", "Bob"],
    });
    expect(g.players).toHaveLength(2);
    expect(g.tier1.visible).toHaveLength(4);
    expect(g.tokens.Gold).toBe(5);
    expect(g.curValidActions).toContain("TAKE_TOKEN");
  });

  it("takes three distinct gems", () => {
    const g = createSplendorGame({ playerNames: ["Alice", "Bob"] });
    const res = applySplendorAction(g, "Alice", {
      action: "TAKE_TOKEN",
      payload: {
        takeTokens: { White: 1, Blue: 1, Green: 1 },
        putBackTokens: {},
      },
    });
    expect(res.error).toBeUndefined();
    expect(res.state.players[0]!.tokens.White).toBe(1);
    expect(res.state.turnCounter).toBe(1);
  });

  it("creates a cities game with city deck", () => {
    const g = createSplendorGame({
      playerNames: ["A", "B"],
      version: "BASE_ORIENT_CITIES",
    });
    expect(g.gameVersion).toBe("BASE_ORIENT_CITIES");
    expect(g.citiesDeck?.visible).toHaveLength(3);
    expect(g.prestigePointsToWin).toBe(-1);
  });

  it("creates a trade routes game", () => {
    const g = createSplendorGame({
      playerNames: ["A", "B"],
      version: "BASE_ORIENT_TRADE_ROUTES",
    });
    expect(g.players[0]!.coatsOfArmsUnplaced).toBe(5);
    expect(g.players[0]!.powers).toBeDefined();
  });
});
