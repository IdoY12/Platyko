import { describe, expect, it } from "vitest";
import { MASCOT_POSES } from "./mascotPoses";
import { canTransitionDirectly, clampMood, MASCOT_STATES, mascotTransitionPath, streakWarmth } from "./mascotStates";

describe("mascot state machine", () => {
  it("defines exactly the twelve PRD states", () => {
    expect([...MASCOT_STATES].sort()).toEqual(
      ["cheer", "comfort", "defeat", "dive", "glow", "hide", "idle", "sense", "sleep", "think", "victory", "wave"],
    );
  });

  it("has a pose for every state", () => {
    expect(Object.keys(MASCOT_POSES).sort()).toEqual([...MASCOT_STATES].sort());
  });

  it("lets every state reach and leave idle directly", () => {
    for (const state of MASCOT_STATES) {
      expect(canTransitionDirectly("idle", state)).toBe(true);
      expect(canTransitionDirectly(state, "idle")).toBe(true);
    }
  });

  it("routes an unrelated request through idle", () => {
    expect(mascotTransitionPath("sleep", "victory")).toEqual(["idle", "victory"]);
    expect(mascotTransitionPath("think", "cheer")).toEqual(["cheer"]);
    expect(mascotTransitionPath("glow", "glow")).toEqual([]);
  });

  it("only lists known states as transition targets", () => {
    for (const from of MASCOT_STATES) {
      for (const to of MASCOT_STATES) expect(typeof canTransitionDirectly(from, to)).toBe("boolean");
    }
  });
});

describe("mascot inputs", () => {
  it("clamps mood to the -1..1 range and treats bad input as neutral", () => {
    expect(clampMood(3)).toBe(1);
    expect(clampMood(-2)).toBe(-1);
    expect(clampMood(Number.NaN)).toBe(0);
  });

  it("warms the halo with the streak and saturates at thirty days", () => {
    expect(streakWarmth(0)).toBe(0);
    expect(streakWarmth(-4)).toBe(0);
    expect(streakWarmth(7)).toBeGreaterThan(streakWarmth(3));
    expect(streakWarmth(30)).toBe(1);
    expect(streakWarmth(400)).toBe(1);
  });
});
