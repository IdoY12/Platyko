import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS, type AttemptRecord } from "@project/learning-logic";
import type { ProgressResponse } from "@project/api-contract";
import reducer, { applyServerProgress, recordAttempt, recordLessonCompletion, setContentMap, cacheLesson } from "./learning-slice";

const attempt = (clientAttemptId: string, itemId = "item-a"): AttemptRecord => ({
  clientAttemptId,
  itemId,
  itemVersion: 1,
  correct: true,
  attemptNo: 1,
  optionIndex: 0,
  usedHint: 0,
  context: "LESSON",
  lessonId: "unit.lesson-1",
  answeredAt: "2026-11-14T10:00:00Z",
});

const serverAnswer = (xpTotal: number): ProgressResponse => ({
  progress: { ...EMPTY_PROGRESS, xpTotal, paidItemIds: ["item-a"] },
  level: 1,
  resume: null,
  goals: { weeklyGoalDays: 3, dailyGoalLessons: 2 },
});

describe("learning slice", () => {
  it("applies an attempt at once and queues it; a guest also keeps it for the sign-up upload", () => {
    const state = reducer(undefined, recordAttempt({ attempt: attempt("a-1"), concept: "loops", today: "2026-11-14", isGuest: true }));
    expect(state.progress.xpTotal).toBe(10);
    expect(state.pendingAttempts).toHaveLength(1);
    expect(state.guestHistory.attempts).toHaveLength(1);
    const registered = reducer(undefined, recordAttempt({ attempt: attempt("a-1"), concept: "loops", today: "2026-11-14", isGuest: false }));
    expect(registered.guestHistory.attempts).toHaveLength(0);
  });

  it("takes the server's progress and replays what was answered while the request was in flight", () => {
    let state = reducer(undefined, recordAttempt({ attempt: attempt("a-1"), concept: "loops", today: "2026-11-14", isGuest: false }));
    state = reducer(state, recordAttempt({ attempt: attempt("a-2", "item-b"), concept: "loops", today: "2026-11-14", isGuest: false }));
    state = reducer(state, applyServerProgress({ response: serverAnswer(10), sentAttemptIds: ["a-1"], sentLessonIds: [] }));
    expect(state.pendingAttempts.map((pending) => pending.attempt.clientAttemptId)).toEqual(["a-2"]);
    expect(state.progress.xpTotal).toBe(20);
    expect(state.goals).toEqual({ weeklyGoalDays: 3, dailyGoalLessons: 2 });
  });

  it("clears the resume point when its lesson is finished", () => {
    let state = reducer(undefined, { type: "learning/saveResume", payload: { lessonId: "unit.lesson-1", session: { lessonId: "unit.lesson-1", slots: [], position: 0, items: {} } } });
    state = reducer(state, recordLessonCompletion({ lesson: { lessonId: "unit.lesson-1", flawless: true, accuracy: 100 }, today: "2026-11-14", isGuest: true }));
    expect(state.resume).toBeNull();
    expect(state.progress.xpTotal).toBe(30);
  });

  it("drops cached lessons when the bank changes", () => {
    let state = reducer(undefined, setContentMap({ bankHash: "one", units: [] }));
    state = reducer(state, cacheLesson({ lessonId: "unit.lesson-1", unit: "unit", conceptCard: null, conceptCardTrace: null, items: [] }));
    expect(Object.keys(state.lessons)).toEqual(["unit.lesson-1"]);
    expect(Object.keys(reducer(state, setContentMap({ bankHash: "one", units: [] })).lessons)).toEqual(["unit.lesson-1"]);
    expect(reducer(state, setContentMap({ bankHash: "two", units: [] })).lessons).toEqual({});
  });
});
