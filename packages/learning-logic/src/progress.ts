import type { Track } from "@project/content-model";
import { EMPTY_STREAK, streakOnActivity, type StreakState } from "@project/streak-logic";
import { levelForXp } from "@project/xp-constants";
import { isCleanFirstAttempt, MAX_ATTEMPTS_PER_ITEM, type AttemptRecord } from "./attempts.js";
import { conceptMasteryScore, MASTERY_WINDOW_ITEMS, type FirstAttempt } from "./mastery.js";
import { INITIAL_REVIEW_STATE, reviewDueDate, reviewQualityOf, scheduleReview, type ReviewState } from "./spacedReview.js";
import type { DailyChallengeResult } from "./dailyChallenge.js";
import { xpForAttempt, xpForLessonCompletion } from "./xpAwards.js";

/**
 * A learner's whole progress as plain data, and the two functions that change it. The server
 * loads this from its tables, applies a batch and stores the result; a guest's device keeps it
 * locally and applies the same functions. Because both run this code, XP, mastery, review dates
 * and the streak can never be computed differently in the two places (PRD 6.7, 6.8, 10.2).
 */

export type ConceptProgress = {
  concept: string;
  /** 0 to 100. */
  score: number;
  /** First attempts at the last ten different items of the concept, oldest first. */
  recentFirstAttempts: FirstAttempt[];
  review: ReviewState;
  /** Calendar date the concept is due for review; null until it has been practised. */
  dueDate: string | null;
};

export type PracticeDay = { date: string; lessonsCompleted: number; itemsAnswered: number; xpEarned: number };

export type LessonCompletionRecord = { lessonId: string; flawless: boolean; bestAccuracy: number };

export type ProgressSnapshot = {
  xpTotal: number;
  streak: StreakState;
  /** Items that have paid their one-time XP. */
  paidItemIds: string[];
  /** How many visits the learner has made to each item. */
  timesAnswered: Record<string, number>;
  completedLessons: LessonCompletionRecord[];
  concepts: ConceptProgress[];
  /** The most recent days with practice, oldest first, for the activity map and the weekly goal. */
  practiceDays: PracticeDay[];
  /** Tracks opened by a passed jump test. */
  jumpedTracks: Track[];
  /** The most recent daily challenges, oldest first. */
  dailyChallenges: DailyChallengeResult[];
};

export const EMPTY_PROGRESS: ProgressSnapshot = {
  xpTotal: 0,
  streak: EMPTY_STREAK,
  paidItemIds: [],
  timesAnswered: {},
  completedLessons: [],
  concepts: [],
  practiceDays: [],
  jumpedTracks: [],
  dailyChallenges: [],
};

/** Twelve weeks of the profile's activity map. */
export const PRACTICE_DAYS_KEPT = 84;

export function levelOf(snapshot: ProgressSnapshot): number {
  return levelForXp(snapshot.xpTotal);
}

/** Adds a change to a calendar day's practice record, creating the day when needed. */
export function withPracticeDay(days: PracticeDay[], today: string, change: Partial<Omit<PracticeDay, "date">>): PracticeDay[] {
  const existing = days.find((day) => day.date === today) ?? { date: today, lessonsCompleted: 0, itemsAnswered: 0, xpEarned: 0 };
  const updated: PracticeDay = {
    date: today,
    lessonsCompleted: existing.lessonsCompleted + (change.lessonsCompleted ?? 0),
    itemsAnswered: existing.itemsAnswered + (change.itemsAnswered ?? 0),
    xpEarned: existing.xpEarned + (change.xpEarned ?? 0),
  };
  return [...days.filter((day) => day.date !== today), updated].sort((left, right) => (left.date < right.date ? -1 : 1)).slice(-PRACTICE_DAYS_KEPT);
}

function withConceptResult(concepts: ConceptProgress[], concept: string, attempt: AttemptRecord, visitEnded: boolean, today: string): ConceptProgress[] {
  const existing = concepts.find((candidate) => candidate.concept === concept) ?? {
    concept,
    score: 0,
    recentFirstAttempts: [],
    review: INITIAL_REVIEW_STATE,
    dueDate: null,
  };
  // The first answer of a visit is the evidence for mastery; a later visit to the same item replaces the earlier one.
  const recentFirstAttempts =
    attempt.attemptNo === 1
      ? [...existing.recentFirstAttempts.filter((first) => first.itemId !== attempt.itemId), { itemId: attempt.itemId, clean: isCleanFirstAttempt(attempt) }].slice(-MASTERY_WINDOW_ITEMS)
      : existing.recentFirstAttempts;
  // A first visit ends on a right answer or on the reveal; that is when the review date moves.
  const firstVisit = attempt.attemptNo <= MAX_ATTEMPTS_PER_ITEM;
  const review = visitEnded && firstVisit ? scheduleReview(existing.review, reviewQualityOf(attempt)) : existing.review;
  const updated: ConceptProgress = {
    concept,
    recentFirstAttempts,
    score: conceptMasteryScore(recentFirstAttempts),
    review,
    dueDate: review === existing.review ? existing.dueDate : reviewDueDate(today, review.intervalDays),
  };
  return [...concepts.filter((candidate) => candidate.concept !== concept), updated];
}

/**
 * Applies one attempt. `concept` is the item's concept and `today` the learner's calendar date
 * (already checked by the server for a registered user). Returns the new snapshot and the XP
 * this attempt earned.
 */
export function applyAttempt(snapshot: ProgressSnapshot, attempt: AttemptRecord, concept: string, today: string): { snapshot: ProgressSnapshot; xpEarned: number } {
  const alreadyPaid = snapshot.paidItemIds.includes(attempt.itemId);
  if (attempt.context === "MIGRATED") {
    // A legacy completion was paid under the old model: it only marks the item as paid.
    return { snapshot: alreadyPaid ? snapshot : { ...snapshot, paidItemIds: [...snapshot.paidItemIds, attempt.itemId] }, xpEarned: 0 };
  }
  const xpEarned = xpForAttempt(attempt, alreadyPaid);
  const paysOnce = xpEarned > 0 && attempt.context !== "REVIEW";
  const visitEnded = attempt.correct || attempt.attemptNo % MAX_ATTEMPTS_PER_ITEM === 0;
  const startsVisit = attempt.attemptNo % MAX_ATTEMPTS_PER_ITEM === 1;
  const feedsLearning = attempt.context !== "JUMP_TEST";
  return {
    xpEarned,
    snapshot: {
      ...snapshot,
      xpTotal: snapshot.xpTotal + xpEarned,
      paidItemIds: paysOnce ? [...snapshot.paidItemIds, attempt.itemId] : snapshot.paidItemIds,
      timesAnswered: startsVisit ? { ...snapshot.timesAnswered, [attempt.itemId]: (snapshot.timesAnswered[attempt.itemId] ?? 0) + 1 } : snapshot.timesAnswered,
      concepts: feedsLearning ? withConceptResult(snapshot.concepts, concept, attempt, visitEnded, today) : snapshot.concepts,
      practiceDays: withPracticeDay(snapshot.practiceDays, today, { itemsAnswered: startsVisit ? 1 : 0, xpEarned }),
      streak: attempt.correct && feedsLearning ? streakOnActivity(snapshot.streak, today) : snapshot.streak,
    },
  };
}

/** Applies a finished lesson: its one-time XP, the best accuracy and the day's lesson count. */
export function applyLessonCompletion(
  snapshot: ProgressSnapshot,
  lesson: { lessonId: string; flawless: boolean; accuracy: number },
  today: string,
): { snapshot: ProgressSnapshot; xpEarned: number } {
  const earlier = snapshot.completedLessons.find((completion) => completion.lessonId === lesson.lessonId);
  const xpEarned = xpForLessonCompletion(lesson, { completed: earlier !== undefined, flawless: earlier?.flawless ?? false });
  const record: LessonCompletionRecord = {
    lessonId: lesson.lessonId,
    flawless: lesson.flawless || (earlier?.flawless ?? false),
    bestAccuracy: Math.max(lesson.accuracy, earlier?.bestAccuracy ?? 0),
  };
  return {
    xpEarned,
    snapshot: {
      ...snapshot,
      xpTotal: snapshot.xpTotal + xpEarned,
      completedLessons: [...snapshot.completedLessons.filter((completion) => completion.lessonId !== lesson.lessonId), record],
      practiceDays: withPracticeDay(snapshot.practiceDays, today, { lessonsCompleted: 1, xpEarned }),
      streak: streakOnActivity(snapshot.streak, today),
    },
  };
}

/** Concepts whose review is due on `today`, most overdue first. */
export function conceptsDueForReview(snapshot: ProgressSnapshot, today: string): ConceptProgress[] {
  return snapshot.concepts
    .filter((concept) => concept.dueDate !== null && concept.dueDate <= today)
    .sort((left, right) => ((left.dueDate ?? "") < (right.dueDate ?? "") ? -1 : 1));
}

/** How many distinct days the learner practised in the seven days starting at `weekStart`. */
export function practiceDaysInWeek(snapshot: ProgressSnapshot, weekStart: string): number {
  const weekEnd = reviewDueDate(weekStart, 6);
  return snapshot.practiceDays.filter((day) => day.date >= weekStart && day.date <= weekEnd && day.itemsAnswered > 0).length;
}
