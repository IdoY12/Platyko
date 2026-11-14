import { describe, expect, it } from "vitest";
import { convertLegacyXp, cumulativeXpForLevel, levelForXp, levelProgress } from "./xpModel.js";

describe("level curve", () => {
  it("matches the PRD anchors: level 2 at 150 XP and level 10 at 2,750 XP", () => {
    expect(cumulativeXpForLevel(2)).toBe(150);
    expect(cumulativeXpForLevel(10)).toBe(2750);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(149)).toBe(1);
    expect(levelForXp(150)).toBe(2);
    expect(levelForXp(2749)).toBe(9);
    expect(levelForXp(2750)).toBe(10);
  });

  it("reports progress inside the current level", () => {
    expect(levelProgress(200)).toEqual({ level: 2, xpIntoLevel: 50, xpForNextLevel: 150 });
  });

  it("converts a legacy 250 XP answer to 10 XP", () => {
    expect(convertLegacyXp(250)).toBe(10);
    expect(convertLegacyXp(100_000)).toBe(4000);
  });
});
