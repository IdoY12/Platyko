import { describe, expect, it } from "vitest";
import { applyStreakOnAppOpen, calendarDaysBetweenEarlierAndLater, type DailyXpStreakPersisted } from "@project/streak-logic";
import { buildStreakDotHighlights, shouldShowStreakDotRow, streakDotRowMaxInclusive } from "./dailyXpStreakCore";

const empty: DailyXpStreakPersisted = { streakCount: 0, lastActivityDate: null, lastCheckedDate: null };

describe("calendarDaysBetweenEarlierAndLater", () => {
  it("counts whole local calendar days between ISO date strings", () => {
    expect(calendarDaysBetweenEarlierAndLater("2026-04-14", "2026-04-16")).toBe(2);
    expect(calendarDaysBetweenEarlierAndLater("2026-04-14", "2026-04-15")).toBe(1);
    expect(calendarDaysBetweenEarlierAndLater("2026-04-15", "2026-04-15")).toBe(0);
  });
});

describe("applyStreakOnAppOpen", () => {
  it("new user: first open keeps streak at 0 and sets lastCheckedDate", () => {
    expect(applyStreakOnAppOpen(empty, "2026-04-16")).toEqual({ streakCount: 0, lastActivityDate: null, lastCheckedDate: "2026-04-16" });
  });

  it("resets when the app was not opened for two or more calendar days", () => {
    const s: DailyXpStreakPersisted = { streakCount: 5, lastActivityDate: "2026-04-10", lastCheckedDate: "2026-04-10" };
    expect(applyStreakOnAppOpen(s, "2026-04-12").streakCount).toBe(0);
  });

  it("resets when the last qualifying exercise was two or more calendar days before today", () => {
    const s: DailyXpStreakPersisted = { streakCount: 5, lastActivityDate: "2026-04-14", lastCheckedDate: "2026-04-15" };
    expect(applyStreakOnAppOpen(s, "2026-04-16").streakCount).toBe(0);
  });

  it("streak 5 then miss a day resets to 0 on next open and clears every dot", () => {
    const s = applyStreakOnAppOpen({ streakCount: 5, lastActivityDate: "2026-04-10", lastCheckedDate: "2026-04-10" }, "2026-04-12");
    expect(s.streakCount).toBe(0);
    expect(buildStreakDotHighlights(s.streakCount).every((v) => !v)).toBe(true);
  });
});

describe("buildStreakDotHighlights", () => {
  it("fills at most seven dots for long streaks (UI hides the row when streak exceeds 7)", () => {
    expect(buildStreakDotHighlights(8).filter(Boolean).length).toBe(streakDotRowMaxInclusive);
    expect(buildStreakDotHighlights(0).filter(Boolean).length).toBe(0);
    expect(shouldShowStreakDotRow(7)).toBe(true);
    expect(shouldShowStreakDotRow(8)).toBe(false);
  });
});
