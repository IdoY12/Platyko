/**
 * The rules of answering one item (PRD 6.5): two attempts, an explanation of the chosen mistake
 * after the first wrong one, the solution after the second. Hints never cost XP; they only stop
 * the answer from counting as a clean first attempt for mastery.
 */

export const MAX_ATTEMPTS_PER_ITEM = 2;
export const HINT_LEVELS = 3;

/** Where an attempt happened; decides what it pays and whether it feeds the review schedule. */
export const ATTEMPT_CONTEXTS = ["LESSON", "REVIEW", "DAILY_CHALLENGE", "REVISION", "JUMP_TEST", "MIGRATED"] as const;
export type AttemptContext = (typeof ATTEMPT_CONTEXTS)[number];

/** One answer to one item, as recorded on the device and sent to the server in batches. */
export type AttemptRecord = {
  /** Idempotency key: the same attempt arriving twice, or from two devices, is stored once. */
  clientAttemptId: string;
  itemId: string;
  itemVersion: number;
  correct: boolean;
  /** 1 or 2. */
  attemptNo: number;
  /** The option whose feedback was shown, when the answer mapped to one. */
  optionIndex: number | null;
  /** Highest hint level opened before answering, 0 to 3. */
  usedHint: number;
  context: AttemptContext;
  lessonId: string | null;
  /** ISO timestamp from the device; the server clamps it (see `trustedCalendarDate`). */
  answeredAt: string;
};

export type AttemptOutcome =
  /** Right: show why, then continue. */
  | "correct"
  /** First wrong answer: explain the chosen mistake, keep the solution hidden, offer a retry. */
  | "retry"
  /** Second wrong answer: reveal the solution; the item goes to review. */
  | "reveal";

export function attemptOutcome(attemptNo: number, correct: boolean): AttemptOutcome {
  if (correct) return "correct";
  return attemptNo < MAX_ATTEMPTS_PER_ITEM ? "retry" : "reveal";
}

/** A clean first attempt is the only kind that raises mastery: right at once, with no hint. */
export function isCleanFirstAttempt(attempt: Pick<AttemptRecord, "correct" | "attemptNo" | "usedHint">): boolean {
  return attempt.correct && attempt.attemptNo === 1 && attempt.usedHint === 0;
}

/**
 * Lesson accuracy (PRD 20.1, L6): items answered correctly on the first attempt divided by all
 * items answered, as a whole percentage. A lesson with one mistake never shows 100%.
 */
export function lessonAccuracy(firstAttemptCorrect: number, itemsAnswered: number): number {
  if (itemsAnswered <= 0) return 0;
  const percentage = Math.floor((firstAttemptCorrect / itemsAnswered) * 100);
  return firstAttemptCorrect < itemsAnswered ? Math.min(99, percentage) : 100;
}
