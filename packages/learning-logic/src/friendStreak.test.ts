import { describe, expect, it } from "vitest";
import { friendStreakDays } from "./friendStreak.js";

describe("friend streak", () => {
  const today = "2026-11-15";

  it("counts the days both practised, back from today or yesterday", () => {
    expect(friendStreakDays(["2026-11-13", "2026-11-14", "2026-11-15"], ["2026-11-14", "2026-11-15", "2026-11-13"], today)).toBe(3);
    expect(friendStreakDays(["2026-11-13", "2026-11-14"], ["2026-11-13", "2026-11-14"], today)).toBe(2);
  });

  it("is broken by a day only one of them practised, and lost after a missed day", () => {
    expect(friendStreakDays(["2026-11-12", "2026-11-14", "2026-11-15"], ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"], today)).toBe(2);
    expect(friendStreakDays(["2026-11-12", "2026-11-13"], ["2026-11-12", "2026-11-13"], today)).toBe(0);
  });

  it("is zero with no shared day, and ignores a day after today (another time zone)", () => {
    expect(friendStreakDays(["2026-11-15"], ["2026-11-14"], today)).toBe(0);
    expect(friendStreakDays(["2026-11-16"], ["2026-11-16"], today)).toBe(0);
  });
});
