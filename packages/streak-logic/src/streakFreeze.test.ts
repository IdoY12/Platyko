import { describe, expect, it } from "vitest";
import { EMPTY_STREAK, isStreakAtRisk, streakOnActivity, streakOnAppOpen, type StreakState } from "./index.js";

const day = (offset: number) => new Date(Date.UTC(2026, 10, 1 + offset)).toISOString().slice(0, 10);
const practise = (state: StreakState, ...offsets: number[]) => offsets.reduce((current, offset) => streakOnActivity(current, day(offset)), state);

describe("streak with freezes", () => {
  it("extends once per day and remembers the best", () => {
    const state = practise(EMPTY_STREAK, 0, 0, 1, 2);
    expect(state).toMatchObject({ current: 3, best: 3, freezes: 0 });
  });

  it("earns a freeze at seven days and holds at most two", () => {
    const week = practise(EMPTY_STREAK, 0, 1, 2, 3, 4, 5, 6);
    expect(week).toMatchObject({ current: 7, freezes: 1 });
    const threeWeeks = practise(week, ...Array.from({ length: 14 }, (_unused, index) => 7 + index));
    expect(threeWeeks).toMatchObject({ current: 21, freezes: 2 });
  });

  it("spends a freeze for a missed day and keeps the streak", () => {
    const week = practise(EMPTY_STREAK, 0, 1, 2, 3, 4, 5, 6);
    const afterGap = streakOnActivity(week, day(8));
    expect(afterGap).toMatchObject({ current: 8, freezes: 0, best: 8 });
  });

  it("restarts at one when the gap is larger than the freezes held, without touching the best", () => {
    const week = practise(EMPTY_STREAK, 0, 1, 2, 3, 4, 5, 6);
    const afterLongGap = streakOnActivity(week, day(9));
    expect(afterLongGap).toMatchObject({ current: 1, best: 7, freezes: 1 });
  });

  it("shows a broken streak on app open only when no freeze covers the gap", () => {
    const week = practise(EMPTY_STREAK, 0, 1, 2, 3, 4, 5, 6);
    expect(streakOnAppOpen(week, day(8)).current).toBe(7);
    expect(streakOnAppOpen(week, day(9)).current).toBe(0);
    expect(streakOnAppOpen(practise(EMPTY_STREAK, 0, 1), day(3)).current).toBe(0);
  });

  it("ignores an activity dated before the last one", () => {
    const state = practise(EMPTY_STREAK, 5);
    expect(streakOnActivity(state, day(3))).toBe(state);
  });

  it("is at risk only with a streak, no activity today and no freeze", () => {
    const three = practise(EMPTY_STREAK, 0, 1, 2);
    expect(isStreakAtRisk(three, day(3))).toBe(true);
    expect(isStreakAtRisk(three, day(2))).toBe(false);
    expect(isStreakAtRisk(practise(EMPTY_STREAK, 0, 1, 2, 3, 4, 5, 6), day(7))).toBe(false);
    expect(isStreakAtRisk(EMPTY_STREAK, day(0))).toBe(false);
  });
});
