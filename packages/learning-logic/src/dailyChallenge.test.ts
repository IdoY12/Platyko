import { describe, expect, it } from "vitest";
import { applyDailyChallenge, DAILY_CHALLENGE_LENGTH, dailyChallengeDate, dailyChallengeId, dailyChallengeItemIds, EMPTY_PROGRESS, type MapUnit } from "./index.js";

const unit = (name: string, order: number): MapUnit => ({
  unit: name,
  track: "BEGINNER",
  order,
  title: name,
  summary: "",
  lessons: [
    ...[1, 2, 3, 4].map((lesson) => ({ id: `${name}.lesson-${lesson}`, title: "", concept: `${name}.c${lesson}`, itemIds: [1, 2, 3, 4, 5].map((item) => `${name}.${lesson}.${item}`) })),
    { id: `${name}.summary`, title: null, concept: null, itemIds: [] },
  ],
});
const map = [unit("one", 1), unit("two", 2)];

describe("daily challenge", () => {
  it("round-trips its id and rejects other ids", () => {
    expect(dailyChallengeDate(dailyChallengeId("2026-11-14"))).toBe("2026-11-14");
    expect(dailyChallengeDate("daily:soon")).toBeNull();
    expect(dailyChallengeDate("one.lesson-1")).toBeNull();
  });

  it("picks five items from finished lessons, the same all day and different the next day", () => {
    const finished = new Set(["two.lesson-3", "two.lesson-4"]);
    const today = dailyChallengeItemIds(map, finished, "2026-11-14");
    expect(today).toHaveLength(DAILY_CHALLENGE_LENGTH);
    expect(today.every((itemId) => itemId.startsWith("two.3.") || itemId.startsWith("two.4."))).toBe(true);
    expect(dailyChallengeItemIds(map, finished, "2026-11-14")).toEqual(today);
    expect(dailyChallengeItemIds(map, finished, "2026-11-15")).not.toEqual(today);
  });

  it("gives a newcomer the first lessons of the map", () => {
    const ids = dailyChallengeItemIds(map, new Set(), "2026-11-14");
    expect(ids).toHaveLength(DAILY_CHALLENGE_LENGTH);
    expect(ids.every((itemId) => itemId.startsWith("one.1.") || itemId.startsWith("one.2."))).toBe(true);
  });

  it("pays 30 XP and keeps the streak once per day", () => {
    const first = applyDailyChallenge(EMPTY_PROGRESS, { date: "2026-11-14", grid: [true, false, true, true, true] }, "2026-11-14");
    expect(first.xpEarned).toBe(30);
    expect(first.snapshot.streak.current).toBe(1);
    expect(first.snapshot.dailyChallenges).toHaveLength(1);
    const again = applyDailyChallenge(first.snapshot, { date: "2026-11-14", grid: [true, true, true, true, true] }, "2026-11-14");
    expect(again.xpEarned).toBe(0);
    expect(again.snapshot).toBe(first.snapshot);
  });
});
