import { describe, expect, it } from "vitest";
import {
  advanceLesson,
  answerCurrentItem,
  attemptOutcome,
  buildLessonPlan,
  buildSummaryLessonPlan,
  conceptMasteryScore,
  currentSlot,
  INITIAL_REVIEW_STATE,
  isCleanFirstAttempt,
  isLessonFinished,
  isReviewDue,
  lessonAccuracy,
  lessonResult,
  lessonStatesOf,
  nextLessonId,
  pickReviewItems,
  reviewDueDate,
  reviewQualityOf,
  scheduleReview,
  startLessonSession,
  summaryLessonId,
  trackCompletion,
  xpForAttempt,
  xpForLessonCompletion,
  type LearnerProgress,
  type LessonSession,
  type MapUnit,
  type ReviewCandidate,
} from "./index.js";

describe("attempt rules", () => {
  it("explains after the first wrong answer and reveals after the second", () => {
    expect(attemptOutcome(1, true)).toBe("correct");
    expect(attemptOutcome(1, false)).toBe("retry");
    expect(attemptOutcome(2, true)).toBe("correct");
    expect(attemptOutcome(2, false)).toBe("reveal");
  });

  it("counts only a right first answer without a hint as clean", () => {
    expect(isCleanFirstAttempt({ correct: true, attemptNo: 1, usedHint: 0 })).toBe(true);
    expect(isCleanFirstAttempt({ correct: true, attemptNo: 1, usedHint: 1 })).toBe(false);
    expect(isCleanFirstAttempt({ correct: true, attemptNo: 2, usedHint: 0 })).toBe(false);
  });

  it("never shows 100% accuracy for a lesson with a mistake", () => {
    expect(lessonAccuracy(8, 8)).toBe(100);
    expect(lessonAccuracy(7, 8)).toBe(87);
    expect(lessonAccuracy(199, 200)).toBe(99);
    expect(lessonAccuracy(0, 0)).toBe(0);
  });
});

describe("XP awards", () => {
  const lesson = (attemptNo: number, correct = true) => ({ attemptNo, correct, context: "LESSON" as const });

  it("pays 10 for a first-attempt answer, 5 for a later one, once per item", () => {
    expect(xpForAttempt(lesson(1), false)).toBe(10);
    expect(xpForAttempt(lesson(2), false)).toBe(5);
    expect(xpForAttempt(lesson(3), false)).toBe(5);
    expect(xpForAttempt(lesson(1), true)).toBe(0);
    expect(xpForAttempt(lesson(1, false), false)).toBe(0);
  });

  it("pays review answers every time and nothing for migrated, jump-test or daily-challenge answers", () => {
    expect(xpForAttempt({ attemptNo: 1, correct: true, context: "REVIEW" }, true)).toBe(5);
    expect(xpForAttempt({ attemptNo: 1, correct: true, context: "MIGRATED" }, false)).toBe(0);
    expect(xpForAttempt({ attemptNo: 1, correct: true, context: "JUMP_TEST" }, false)).toBe(0);
    expect(xpForAttempt({ attemptNo: 1, correct: true, context: "DAILY_CHALLENGE" }, false)).toBe(0);
  });

  it("uses hints without reducing XP", () => {
    expect(xpForAttempt(lesson(1), false)).toBe(10);
  });

  it("pays a lesson once, and the no-mistakes bonus the first time it is earned", () => {
    expect(xpForLessonCompletion({ flawless: true }, { completed: false, flawless: false })).toBe(30);
    expect(xpForLessonCompletion({ flawless: false }, { completed: false, flawless: false })).toBe(20);
    expect(xpForLessonCompletion({ flawless: true }, { completed: true, flawless: false })).toBe(10);
    expect(xpForLessonCompletion({ flawless: true }, { completed: true, flawless: true })).toBe(0);
  });
});

describe("mastery", () => {
  const attempts = (...clean: boolean[]) => clean.map((value, index) => ({ itemId: `item-${index}`, clean: value }));

  it("is the share of clean first attempts over the last ten items", () => {
    expect(conceptMasteryScore(attempts(true, true, true, true, true))).toBe(100);
    expect(conceptMasteryScore(attempts(true, false, true, false, true, true, true, true, true, true))).toBe(80);
    expect(conceptMasteryScore(attempts(false, false, ...Array.from({ length: 10 }, () => true)))).toBe(100);
  });

  it("does not call two lucky answers mastery", () => {
    expect(conceptMasteryScore(attempts(true, true))).toBe(40);
    expect(conceptMasteryScore([])).toBe(0);
  });
});

describe("spaced review (SM-2)", () => {
  it("grows the interval 1, 6, then by the ease factor", () => {
    const first = scheduleReview(INITIAL_REVIEW_STATE, 5);
    const second = scheduleReview(first, 5);
    const third = scheduleReview(second, 5);
    expect([first.intervalDays, second.intervalDays]).toEqual([1, 6]);
    expect(third.intervalDays).toBe(Math.round(6 * third.ease));
    expect(third.ease).toBeGreaterThan(2.5);
  });

  it("brings a failed concept back the next day, well inside three days", () => {
    const learned = scheduleReview(scheduleReview(INITIAL_REVIEW_STATE, 5), 5);
    const failed = scheduleReview(learned, reviewQualityOf({ correct: false, attemptNo: 2, usedHint: 0 }));
    expect(failed).toMatchObject({ repetitions: 0, intervalDays: 1 });
    expect(reviewDueDate("2026-11-14", failed.intervalDays)).toBe("2026-11-15");
    expect(isReviewDue("2026-11-15", "2026-11-15")).toBe(true);
    expect(isReviewDue("2026-11-15", "2026-11-14")).toBe(false);
  });

  it("never lets the ease factor fall below 1.3", () => {
    let state = INITIAL_REVIEW_STATE;
    for (let round = 0; round < 12; round += 1) state = scheduleReview(state, 0);
    expect(state.ease).toBe(1.3);
  });

  it("rates a clean answer above a hinted one above a second attempt", () => {
    expect(reviewQualityOf({ correct: true, attemptNo: 1, usedHint: 0 })).toBe(5);
    expect(reviewQualityOf({ correct: true, attemptNo: 1, usedHint: 2 })).toBe(4);
    expect(reviewQualityOf({ correct: true, attemptNo: 2, usedHint: 0 })).toBe(2);
  });

  it("brings a concept back the next day when its item was right only on the second attempt", () => {
    const learned = scheduleReview(scheduleReview(INITIAL_REVIEW_STATE, 5), 5);
    expect(learned.intervalDays).toBe(6);
    expect(scheduleReview(learned, reviewQualityOf({ correct: true, attemptNo: 2, usedHint: 0 }))).toMatchObject({ repetitions: 0, intervalDays: 1 });
  });

  it("crosses a month boundary correctly", () => {
    expect(reviewDueDate("2026-01-30", 6)).toBe("2026-02-05");
  });
});

const makeUnit = (track: MapUnit["track"], order: number, unit: string): MapUnit => ({
  unit,
  track,
  order,
  title: unit,
  summary: "",
  lessons: [
    ...[1, 2, 3, 4].map((lesson) => ({ id: `${unit}.lesson-${lesson}`, title: `Lesson ${lesson}`, concept: `${unit}-concept-${lesson}`, itemIds: [`${unit}-item-${lesson}a`, `${unit}-item-${lesson}b`] })),
    { id: summaryLessonId(unit), title: null, concept: null, itemIds: [] },
  ],
});
const map = [makeUnit("BEGINNER", 1, "values"), makeUnit("BEGINNER", 2, "variables"), makeUnit("INTERMEDIATE", 1, "methods")];
const progressOf = (overrides: Partial<LearnerProgress> = {}): LearnerProgress => ({
  completedLessonIds: new Set(),
  inProgressLessonId: null,
  masteryByConcept: {},
  jumpedTracks: new Set(),
  ...overrides,
});
const allLessonIds = (unit: MapUnit) => unit.lessons.map((lesson) => lesson.id);

describe("skill map", () => {
  it("opens only the first lesson for a new learner", () => {
    expect(lessonStatesOf(map, map[0], progressOf())).toEqual(["available", "locked", "locked", "locked", "locked"]);
    expect(lessonStatesOf(map, map[1], progressOf())).toEqual(["locked", "locked", "locked", "locked", "locked"]);
    expect(nextLessonId(map, progressOf())).toBe("values.lesson-1");
  });

  it("shows completed, mastered and in-progress lessons and updates as soon as a lesson ends", () => {
    const progress = progressOf({
      completedLessonIds: new Set(["values.lesson-1", "values.lesson-2"]),
      inProgressLessonId: "values.lesson-3",
      masteryByConcept: { "values-concept-1": 85, "values-concept-2": 60 },
    });
    expect(lessonStatesOf(map, map[0], progress)).toEqual(["mastered", "completed", "inProgress", "locked", "locked"]);
    expect(nextLessonId(map, progress)).toBe("values.lesson-3");
  });

  it("unlocks the next unit only when every lesson of the previous one is completed", () => {
    const fourDone = progressOf({ completedLessonIds: new Set(allLessonIds(map[0]).slice(0, 4)) });
    expect(lessonStatesOf(map, map[1], fourDone)[0]).toBe("locked");
    const allDone = progressOf({ completedLessonIds: new Set(allLessonIds(map[0])) });
    expect(lessonStatesOf(map, map[1], allDone)[0]).toBe("available");
    expect(nextLessonId(map, allDone)).toBe("variables.lesson-1");
  });

  it("opens a later track through a jump test or by finishing the track before it", () => {
    expect(lessonStatesOf(map, map[2], progressOf())[0]).toBe("locked");
    expect(lessonStatesOf(map, map[2], progressOf({ jumpedTracks: new Set(["INTERMEDIATE"]) }))[0]).toBe("available");
    const beginnerDone = progressOf({ completedLessonIds: new Set([...allLessonIds(map[0]), ...allLessonIds(map[1])]) });
    expect(lessonStatesOf(map, map[2], beginnerDone)[0]).toBe("available");
  });

  it("marks the summary lesson mastered only when all four concepts are", () => {
    const mastery = Object.fromEntries([1, 2, 3, 4].map((lesson) => [`values-concept-${lesson}`, 90]));
    const done = progressOf({ completedLessonIds: new Set(allLessonIds(map[0])), masteryByConcept: mastery });
    expect(lessonStatesOf(map, map[0], done)[4]).toBe("mastered");
    expect(lessonStatesOf(map, map[0], { ...done, masteryByConcept: { ...mastery, "values-concept-4": 50 } })[4]).toBe("completed");
  });

  it("reports track completion and nothing left to continue when all is done", () => {
    const everything = progressOf({ completedLessonIds: new Set(map.flatMap(allLessonIds)) });
    expect(trackCompletion(map, "BEGINNER", everything)).toBe(1);
    expect(trackCompletion(map, "BEGINNER", progressOf({ completedLessonIds: new Set(["values.lesson-1"]) }))).toBe(0.1);
    expect(nextLessonId(map, everything)).toBeNull();
  });
});

const candidate = (itemId: string, concept: string, overrides: Partial<ReviewCandidate> = {}): ReviewCandidate => ({
  itemId,
  concept,
  due: false,
  mastery: 50,
  timesAnswered: 1,
  ...overrides,
});

describe("lesson plans", () => {
  const lesson = { id: "variables.lesson-1", title: "Naming a value", concept: "let", itemIds: ["a", "b", "c", "d", "e", "f"] };

  it("is a concept card, the new items in order, then review up to eight slots", () => {
    const plan = buildLessonPlan(lesson, [candidate("r1", "numbers"), candidate("r2", "strings")]);
    expect(plan).toHaveLength(8);
    expect(plan[0]).toEqual({ kind: "conceptCard" });
    expect(plan.slice(1, 7).map((slot) => (slot.kind === "item" ? slot.itemId : ""))).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(plan[7]).toMatchObject({ kind: "item", review: true });
  });

  it("is shorter when nothing earlier exists to review", () => {
    expect(buildLessonPlan(lesson, [])).toHaveLength(7);
  });

  it("prefers a due concept, then the weakest, and an item not seen before", () => {
    const candidates = [
      candidate("strong", "numbers", { mastery: 90 }),
      candidate("weak-seen", "strings", { mastery: 20, timesAnswered: 3 }),
      candidate("weak-unseen", "strings", { mastery: 20, timesAnswered: 0 }),
      candidate("due", "booleans", { mastery: 95, due: true }),
    ];
    expect(pickReviewItems(candidates, 1)).toEqual(["due"]);
    expect(pickReviewItems(candidates, 3)).toEqual(["due", "weak-unseen", "strong"]);
    expect(pickReviewItems(candidates, 2, new Set(["due"]))).toEqual(["weak-unseen", "strong"]);
  });

  it("builds the summary lesson from the unit's own items only", () => {
    const unit = map[0];
    const own = unit.lessons.flatMap((unitLesson) => unitLesson.itemIds.map((itemId) => candidate(itemId, unitLesson.concept ?? "")));
    const plan = buildSummaryLessonPlan(unit, [...own, candidate("foreign", "elsewhere", { due: true })]);
    expect(plan).toHaveLength(8);
    expect(plan.every((slot) => slot.kind === "item" && slot.itemId !== "foreign")).toBe(true);
  });
});

describe("lesson session", () => {
  const plan = [{ kind: "conceptCard" as const }, { kind: "item" as const, itemId: "a", review: false }, { kind: "item" as const, itemId: "b", review: false }];
  const answer = (session: LessonSession, correct: boolean) => answerCurrentItem(session, correct);

  it("walks the plan and reports a flawless lesson", () => {
    let session = advanceLesson(startLessonSession("lesson", plan));
    const first = answer(session, true);
    expect(first).toMatchObject({ outcome: "correct", attemptNo: 1 });
    session = advanceLesson(first.session);
    session = advanceLesson(answer(session, true).session);
    expect(isLessonFinished(session)).toBe(true);
    expect(lessonResult(session)).toEqual({ itemsAnswered: 2, firstAttemptCorrect: 2, accuracy: 100, flawless: true });
  });

  it("brings an item answered wrongly back once at the end, with later attempt numbers", () => {
    let session = advanceLesson(startLessonSession("lesson", plan));
    const wrong = answer(session, false);
    expect(wrong).toMatchObject({ outcome: "retry", attemptNo: 1 });
    const second = answer(wrong.session, true);
    expect(second).toMatchObject({ outcome: "correct", attemptNo: 2 });
    session = advanceLesson(second.session);
    expect(session.slots).toHaveLength(4);
    session = advanceLesson(answer(session, true).session);
    expect(currentSlot(session)).toMatchObject({ itemId: "a" });
    const returned = answer(session, true);
    expect(returned).toMatchObject({ outcome: "correct", attemptNo: 3 });
    session = advanceLesson(returned.session);
    expect(session.slots).toHaveLength(4);
    expect(isLessonFinished(session)).toBe(true);
    expect(lessonResult(session)).toEqual({ itemsAnswered: 2, firstAttemptCorrect: 1, accuracy: 50, flawless: false });
  });

  it("reveals the solution after two wrong answers, on the first visit and on the return visit", () => {
    let session = advanceLesson(startLessonSession("lesson", plan));
    session = answer(session, false).session;
    const revealed = answer(session, false);
    expect(revealed).toMatchObject({ outcome: "reveal", attemptNo: 2 });
    session = advanceLesson(advanceLesson(revealed.session));
    const again = answer(session, false);
    expect(again).toMatchObject({ outcome: "retry", attemptNo: 3 });
    expect(answer(again.session, false)).toMatchObject({ outcome: "reveal", attemptNo: 4 });
  });

  it("can be saved and restored as plain data", () => {
    const session = answer(advanceLesson(startLessonSession("lesson", plan)), false).session;
    expect(JSON.parse(JSON.stringify(session))).toEqual(session);
  });
});
