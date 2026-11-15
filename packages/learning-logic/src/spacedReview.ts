/**
 * Review scheduling with SM-2 (PRD 6.7), kept at concept level so the learner meets a different
 * item on the same concept and cannot memorise an answer. The published algorithm:
 * https://super-memory.com/english/ol/sm2.htm
 */

export type ReviewState = {
  /** Consecutive successful reviews. */
  repetitions: number;
  intervalDays: number;
  /** SM-2 easiness factor, never below 1.3. */
  ease: number;
};

export const INITIAL_REVIEW_STATE: ReviewState = { repetitions: 0, intervalDays: 0, ease: 2.5 };

const MINIMUM_EASE = 1.3;
/** SM-2 treats a quality below 3 as a failed recall: the concept starts over and returns tomorrow. */
const PASSING_QUALITY = 3;

/** How well the concept was recalled, on SM-2's 0 to 5 scale. */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Maps what happened on an item to SM-2's quality scale. A right answer on the second attempt
 * still began with a wrong one, so it counts as a failed recall: the concept returns the next day
 * (PRD L7, an item answered wrongly is back in Review within three days).
 */
export function reviewQualityOf(result: { correct: boolean; attemptNo: number; usedHint: number }): ReviewQuality {
  if (!result.correct) return 1;
  if (result.attemptNo > 1) return 2;
  return result.usedHint > 0 ? 4 : 5;
}

export function scheduleReview(state: ReviewState, quality: ReviewQuality): ReviewState {
  const ease = Math.max(MINIMUM_EASE, state.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality < PASSING_QUALITY) return { repetitions: 0, intervalDays: 1, ease };
  const repetitions = state.repetitions + 1;
  const intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(state.intervalDays * ease);
  return { repetitions, intervalDays, ease };
}

/** The calendar date (YYYY-MM-DD) on which a concept reviewed on `today` is due again. */
export function reviewDueDate(today: string, intervalDays: number): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + intervalDays);
  return date.toISOString().slice(0, 10);
}

export function isReviewDue(dueDate: string, today: string): boolean {
  return dueDate <= today;
}
