/**
 * Re-exports shared streak rule math from @project/streak-logic.
 * Dot-row presentation helpers stay mobile-local.
 */

export { applyStreakOnAppOpen, type DailyXpStreakPersisted } from "@project/streak-logic";

/** Streak lengths above this hide the seven-dot row (see home streak card). */
export const streakDotRowMaxInclusive = 7;

export function buildStreakDotHighlights(streakCurrent: number): boolean[] {
  const filledThrough = Math.min(Math.max(streakCurrent, 0), streakDotRowMaxInclusive);
  return Array.from({ length: streakDotRowMaxInclusive }, (_value, index) => index < filledThrough);
}

export function shouldShowStreakDotRow(streakCurrent: number): boolean {
  return streakCurrent <= streakDotRowMaxInclusive;
}
