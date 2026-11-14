/**
 * The user-level XP model (PRD 6.8). XP measures activity and persistence; it is paid once per
 * item, and the level curve rises so that a level means sustained practice.
 */

export const XP_REWARDS = {
  itemCorrectFirstAttempt: 10,
  itemCorrectSecondAttempt: 5,
  lessonCompleted: 20,
  lessonWithoutMistakes: 10,
  reviewItemCorrect: 5,
  dailyChallenge: 30,
  matchParticipation: 10,
  matchWin: 20,
} as const;

/** Legacy totals were paid at 250 XP per answer; dividing by 25 maps 250 to the new 10. */
export const LEGACY_XP_DIVISOR = 25;

/** Unrated games (friend duels, rooms, ghost practice) pay XP for this many games a day (PRD 11.4). */
export const UNRATED_MATCH_XP_GAMES_PER_DAY = 5;

export function convertLegacyXp(legacyXpTotal: number): number {
  return Math.floor(legacyXpTotal / LEGACY_XP_DIVISOR);
}

/** Cumulative XP needed to reach `level`: 50 x n x (n + 1) / 2, with level 1 at zero. */
export function cumulativeXpForLevel(level: number): number {
  return level <= 1 ? 0 : (50 * level * (level + 1)) / 2;
}

export function levelForXp(xpTotal: number): number {
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= xpTotal) level += 1;
  return level;
}

/** Progress inside the current level, for the XP bar. */
export function levelProgress(xpTotal: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  const level = levelForXp(xpTotal);
  const floor = cumulativeXpForLevel(level);
  return { level, xpIntoLevel: xpTotal - floor, xpForNextLevel: cumulativeXpForLevel(level + 1) - floor };
}
