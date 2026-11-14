import { describe, expect, it } from "vitest";
import { applyAttempt, applyLessonCompletion, conceptsDueForReview, EMPTY_PROGRESS, levelOf, practiceDaysInWeek, type AttemptRecord, type ProgressSnapshot } from "./index.js";

let sequence = 0;
const attempt = (overrides: Partial<AttemptRecord>): AttemptRecord => ({
  clientAttemptId: `attempt-${(sequence += 1)}`,
  itemId: "item-a",
  itemVersion: 1,
  correct: true,
  attemptNo: 1,
  optionIndex: null,
  usedHint: 0,
  context: "LESSON",
  lessonId: "unit.lesson-1",
  answeredAt: "2026-11-14T10:00:00Z",
  ...overrides,
});
const apply = (snapshot: ProgressSnapshot, overrides: Partial<AttemptRecord>, today = "2026-11-14") => applyAttempt(snapshot, attempt(overrides), "loops", today);

describe("applyAttempt", () => {
  it("pays an item once: 10 on a first attempt, nothing when solved again", () => {
    const first = apply(EMPTY_PROGRESS, {});
    expect(first.xpEarned).toBe(10);
    expect(first.snapshot).toMatchObject({ xpTotal: 10, paidItemIds: ["item-a"], timesAnswered: { "item-a": 1 } });
    const again = apply(first.snapshot, {});
    expect(again.xpEarned).toBe(0);
    expect(again.snapshot.xpTotal).toBe(10);
    expect(again.snapshot.timesAnswered["item-a"]).toBe(2);
  });

  it("pays 5 when the item is solved on the second attempt and nothing for the wrong first one", () => {
    const wrong = apply(EMPTY_PROGRESS, { correct: false });
    expect(wrong.xpEarned).toBe(0);
    const right = apply(wrong.snapshot, { attemptNo: 2 });
    expect(right.xpEarned).toBe(5);
    expect(right.snapshot.timesAnswered["item-a"]).toBe(1);
  });

  it("pays a review answer every time, without marking the item as paid", () => {
    const review = apply(EMPTY_PROGRESS, { context: "REVIEW" });
    expect(review.xpEarned).toBe(5);
    expect(review.snapshot.paidItemIds).toEqual([]);
    expect(apply(review.snapshot, { context: "REVIEW" }).xpEarned).toBe(5);
  });

  it("treats a migrated legacy completion as already paid", () => {
    const migrated = apply(EMPTY_PROGRESS, { context: "MIGRATED" });
    expect(migrated).toMatchObject({ xpEarned: 0, snapshot: { xpTotal: 0, paidItemIds: ["item-a"] } });
    expect(apply(migrated.snapshot, {}).xpEarned).toBe(0);
  });

  it("ignores hints for XP but not for mastery", () => {
    const hinted = apply(EMPTY_PROGRESS, { usedHint: 2 });
    expect(hinted.xpEarned).toBe(10);
    expect(hinted.snapshot.concepts[0].recentFirstAttempts).toEqual([{ itemId: "item-a", clean: false }]);
  });

  it("schedules the concept for tomorrow after a revealed item", () => {
    const first = apply(EMPTY_PROGRESS, { correct: false });
    expect(first.snapshot.concepts[0].dueDate).toBeNull();
    const revealed = apply(first.snapshot, { correct: false, attemptNo: 2 });
    expect(revealed.snapshot.concepts[0]).toMatchObject({ dueDate: "2026-11-15", score: 0 });
    expect(conceptsDueForReview(revealed.snapshot, "2026-11-15").map((concept) => concept.concept)).toEqual(["loops"]);
    expect(conceptsDueForReview(revealed.snapshot, "2026-11-14")).toEqual([]);
  });

  it("does not move the review date on the return visit at the end of a lesson", () => {
    const revealed = apply(apply(EMPTY_PROGRESS, { correct: false }).snapshot, { correct: false, attemptNo: 2 });
    const returned = apply(revealed.snapshot, { attemptNo: 3 });
    expect(returned.snapshot.concepts[0].review).toEqual(revealed.snapshot.concepts[0].review);
    expect(returned.xpEarned).toBe(5);
  });

  it("raises mastery with clean first attempts on different items", () => {
    let snapshot = EMPTY_PROGRESS;
    for (const itemId of ["a", "b", "c", "d", "e"]) snapshot = apply(snapshot, { itemId }).snapshot;
    expect(snapshot.concepts[0].score).toBe(100);
    snapshot = apply(snapshot, { itemId: "a", correct: false, context: "REVIEW" }).snapshot;
    expect(snapshot.concepts[0].score).toBe(80);
    expect(snapshot.concepts[0].recentFirstAttempts).toHaveLength(5);
  });

  it("extends the streak on a right answer and records the practice day", () => {
    const first = apply(EMPTY_PROGRESS, {}, "2026-11-14");
    const second = apply(first.snapshot, { itemId: "item-b" }, "2026-11-15");
    expect(second.snapshot.streak).toMatchObject({ current: 2, best: 2 });
    expect(second.snapshot.practiceDays).toEqual([
      { date: "2026-11-14", lessonsCompleted: 0, itemsAnswered: 1, xpEarned: 10 },
      { date: "2026-11-15", lessonsCompleted: 0, itemsAnswered: 1, xpEarned: 10 },
    ]);
    expect(apply(EMPTY_PROGRESS, { correct: false }).snapshot.streak.current).toBe(0);
  });

  it("keeps jump-test answers out of mastery, XP and the streak", () => {
    const jump = apply(EMPTY_PROGRESS, { context: "JUMP_TEST" });
    expect(jump).toMatchObject({ xpEarned: 0, snapshot: { xpTotal: 0, concepts: [], streak: { current: 0 } } });
  });
});

describe("applyLessonCompletion", () => {
  it("pays the lesson and the no-mistakes bonus once", () => {
    const first = applyLessonCompletion(EMPTY_PROGRESS, { lessonId: "unit.lesson-1", flawless: false, accuracy: 83 }, "2026-11-14");
    expect(first.xpEarned).toBe(20);
    const replay = applyLessonCompletion(first.snapshot, { lessonId: "unit.lesson-1", flawless: true, accuracy: 100 }, "2026-11-14");
    expect(replay.xpEarned).toBe(10);
    expect(replay.snapshot.completedLessons).toEqual([{ lessonId: "unit.lesson-1", flawless: true, bestAccuracy: 100 }]);
    expect(applyLessonCompletion(replay.snapshot, { lessonId: "unit.lesson-1", flawless: true, accuracy: 90 }, "2026-11-14").xpEarned).toBe(0);
    expect(replay.snapshot.practiceDays[0]).toMatchObject({ lessonsCompleted: 2, xpEarned: 30 });
  });

  it("gives a level that follows the curve", () => {
    let snapshot = EMPTY_PROGRESS;
    for (let lesson = 1; lesson <= 5; lesson += 1) {
      snapshot = applyLessonCompletion(snapshot, { lessonId: `unit.lesson-${lesson}`, flawless: true, accuracy: 100 }, "2026-11-14").snapshot;
    }
    expect(snapshot.xpTotal).toBe(150);
    expect(levelOf(snapshot)).toBe(2);
  });
});

describe("weekly goal", () => {
  it("counts distinct practice days inside the week", () => {
    let snapshot = EMPTY_PROGRESS;
    for (const [index, day] of ["2026-11-08", "2026-11-09", "2026-11-09", "2026-11-14", "2026-11-15"].entries()) {
      snapshot = apply(snapshot, { itemId: `item-${index}` }, day).snapshot;
    }
    expect(practiceDaysInWeek(snapshot, "2026-11-08")).toBe(3);
    expect(practiceDaysInWeek(snapshot, "2026-11-15")).toBe(1);
  });
});
