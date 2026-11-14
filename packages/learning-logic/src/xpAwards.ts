import { XP_REWARDS } from "@project/xp-constants";
import type { AttemptContext } from "./attempts.js";

/**
 * XP for one attempt (PRD 6.8). An item pays once in its lifetime: re-solving it pays only
 * through review. A wrong answer, a migrated record and a jump-test answer pay nothing.
 */
export function xpForAttempt(attempt: { correct: boolean; attemptNo: number; context: AttemptContext }, itemAlreadyPaid: boolean): number {
  if (!attempt.correct) return 0;
  if (attempt.context === "REVIEW") return XP_REWARDS.reviewItemCorrect;
  if (attempt.context === "MIGRATED" || attempt.context === "JUMP_TEST" || attempt.context === "DAILY_CHALLENGE") return 0;
  if (itemAlreadyPaid) return 0;
  return attempt.attemptNo === 1 ? XP_REWARDS.itemCorrectFirstAttempt : XP_REWARDS.itemCorrectSecondAttempt;
}

/**
 * XP for finishing a lesson: the completion reward the first time, and the no-mistakes bonus
 * the first time the lesson is finished without a wrong answer. Replays pay neither again.
 */
export function xpForLessonCompletion(lesson: { flawless: boolean }, earlier: { completed: boolean; flawless: boolean }): number {
  const completion = earlier.completed ? 0 : XP_REWARDS.lessonCompleted;
  const bonus = lesson.flawless && !earlier.flawless ? XP_REWARDS.lessonWithoutMistakes : 0;
  return completion + bonus;
}
