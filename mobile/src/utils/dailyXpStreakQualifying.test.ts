import { describe, expect, it } from "vitest";
import { applyStreakOnAppOpen, applyStreakOnQualifyingXp, type DailyXpStreakPersisted } from "@project/streak-logic";

const day = (streakCount: number, date: string | null, checked = date): DailyXpStreakPersisted =>
  ({ streakCount, lastActivityDate: date, lastCheckedDate: checked });

describe("applyStreakOnQualifyingXp", () => {
  it("first exercise of a new user sets streak to 1", () => {
    expect(applyStreakOnQualifyingXp(day(0, null, "2026-04-16"), "2026-04-16")).toEqual(day(1, "2026-04-16"));
  });

  it("multiple qualifying exercises the same day do not increment again", () => {
    const once = day(1, "2026-04-16");
    expect(applyStreakOnQualifyingXp(once, "2026-04-16")).toEqual(once);
  });

  it("exercise on day 1 then day 2 yields streak 2", () => {
    const openedDay2 = applyStreakOnAppOpen(day(1, "2026-04-16"), "2026-04-17");
    expect(applyStreakOnQualifyingXp(openedDay2, "2026-04-17").streakCount).toBe(2);
  });

  it("exercise day 1 then day 10 without app opens restarts streak at 1 (gap >= 2)", () => {
    expect(applyStreakOnQualifyingXp(day(3, "2026-04-01"), "2026-04-10")).toEqual(day(1, "2026-04-10"));
  });

  it("exercise day 1, skip day 2, exercise day 3 yields streak 1", () => {
    const openedDay2 = applyStreakOnAppOpen(day(1, "2026-04-16"), "2026-04-17");
    expect(openedDay2.streakCount).toBe(1);
    const openedDay3 = applyStreakOnAppOpen(openedDay2, "2026-04-18");
    expect(openedDay3.streakCount).toBe(0);
    expect(applyStreakOnQualifyingXp(openedDay3, "2026-04-18").streakCount).toBe(1);
  });

  it("five exercises in one day keep streak at 1", () => {
    let s = day(0, null, "2026-04-16");
    for (let i = 0; i < 5; i += 1) s = applyStreakOnQualifyingXp(s, "2026-04-16");
    expect(s.streakCount).toBe(1);
  });

  it("eight consecutive qualifying days reach streak count 8", () => {
    let s = day(0, null, null);
    for (let d = 1; d <= 8; d += 1) {
      const date = `2026-04-0${d}`;
      s = applyStreakOnQualifyingXp(applyStreakOnAppOpen(s, date), date);
    }
    expect(s.streakCount).toBe(8);
  });
});
