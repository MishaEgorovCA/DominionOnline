import { describe, it, expect } from "vitest";
import { createNewGame, applyCommand, RECOMMENDED_FIRST_GAME } from "./index.js";

describe("engine smoke", () => {
  it("runs copper buy turns", () => {
    const p1 = "a";
    const p2 = "b";
    let g = createNewGame({
      playerOrder: [p1, p2],
      kingdom: [...RECOMMENDED_FIRST_GAME],
      rngSeed: 1,
    });
    expect(g.phase).toBe("playing");
    let r = applyCommand(g, p1, { name: "enter_buy_phase" });
    expect(r.error).toBeUndefined();
    g = r.state;
    r = applyCommand(g, p1, { name: "buy", card: "copper" });
    expect(r.error).toBeUndefined();
    g = r.state;
    r = applyCommand(g, p1, { name: "end_turn" });
    expect(r.error).toBeUndefined();
    g = r.state;
    expect(g.whoseTurn).toBe(1);
  });
});
