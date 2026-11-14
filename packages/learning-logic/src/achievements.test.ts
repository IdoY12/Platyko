import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, EMPTY_PROGRESS, earnedAchievements, learningFacts, type MapUnit, type ProgressSnapshot } from "./index.js";

const unit: MapUnit = {
  unit: "loops",
  track: "BEGINNER",
  order: 1,
  title: "Loops",
  summary: "",
  lessons: [
    { id: "loops.lesson-1", title: "", concept: "for-loop", itemIds: ["a"] },
    { id: "loops.summary", title: null, concept: null, itemIds: [] },
  ],
};
const concept = (score: number) => ({ concept: "for-loop", score, recentFirstAttempts: [], review: { repetitions: 0, intervalDays: 0, ease: 2.5 }, dueDate: null });

describe("achievements", () => {
  it("has about twenty-five badges with unique codes", () => {
    expect(ACHIEVEMENTS).toHaveLength(25);
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.code)).size).toBe(25);
  });

  it("earns nothing for a new learner", () => {
    expect(earnedAchievements(learningFacts(EMPTY_PROGRESS, [unit]))).toEqual([]);
  });

  it("rewards skill: a mastered unit, a finished track, a perfect track, a jump and a streak", () => {
    const snapshot: ProgressSnapshot = {
      ...EMPTY_PROGRESS,
      concepts: [concept(90)],
      completedLessons: [
        { lessonId: "loops.lesson-1", flawless: true, bestAccuracy: 100 },
        { lessonId: "loops.summary", flawless: false, bestAccuracy: 80 },
      ],
      streak: { ...EMPTY_PROGRESS.streak, best: 8 },
      jumpedTracks: ["INTERMEDIATE"],
    };
    expect(earnedAchievements(learningFacts(snapshot, [unit]))).toEqual(["unit-mastered", "track-beginner", "streak-7", "jumped-ahead", "perfect-track"]);
  });

  it("does not count an unmastered concept or a presence-only fact", () => {
    const snapshot = { ...EMPTY_PROGRESS, concepts: [concept(60)], practiceDays: [{ date: "2026-11-14", lessonsCompleted: 0, itemsAnswered: 40, xpEarned: 0 }] };
    expect(earnedAchievements(learningFacts(snapshot, [unit]))).toEqual([]);
  });
});
