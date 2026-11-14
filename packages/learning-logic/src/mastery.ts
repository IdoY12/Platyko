/**
 * Concept mastery (PRD 6.7): a 0 to 100 score from clean first attempts over the last ten
 * different items answered on the concept. It measures understanding, separately from XP.
 */

export const MASTERY_WINDOW_ITEMS = 10;
/** A lesson shows as mastered once its concept reaches this score. */
export const MASTERED_SCORE = 80;
/** Fewer answers than this cannot prove mastery, however clean they are. */
const MINIMUM_ITEMS_FOR_FULL_SCORE = 5;

/** The first attempt at one item, in the order the items were first answered. */
export type FirstAttempt = { itemId: string; clean: boolean };

/**
 * Score for one concept. `firstAttempts` lists the learner's first attempt at each item of the
 * concept, oldest first; only the latest ten count. With fewer than five items the score is
 * scaled down, so two lucky answers do not read as mastery.
 */
export function conceptMasteryScore(firstAttempts: readonly FirstAttempt[]): number {
  const window = firstAttempts.slice(-MASTERY_WINDOW_ITEMS);
  if (window.length === 0) return 0;
  const cleanShare = window.filter((attempt) => attempt.clean).length / window.length;
  const evidence = Math.min(1, window.length / MINIMUM_ITEMS_FOR_FULL_SCORE);
  return Math.round(cleanShare * evidence * 100);
}

export function isMastered(score: number): boolean {
  return score >= MASTERED_SCORE;
}
