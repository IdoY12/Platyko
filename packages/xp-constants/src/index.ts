/** XP for one correct lesson exercise, code puzzle solve, or duel round answer (single source of truth). */
export const XP_PER_CORRECT_EXERCISE = 250;

/** Hard ceiling on xpTotal — no write path may exceed this. */
export const MAX_XP_TOTAL = 100_000;

export const PUZZLE_MAX_XP_SOLVES = 10;

export type PuzzleXpSolveCounts = Record<string, number>;

export function puzzleXpCountFor(puzzleId: number | string, counts: PuzzleXpSolveCounts): number {
  return counts[String(puzzleId)] ?? 0;
}

export function puzzleXpGrantForSolve(countBeforeSolve: number): { grantXp: boolean; xpEarned: number } {
  const grantXp = countBeforeSolve < PUZZLE_MAX_XP_SOLVES;
  return { grantXp, xpEarned: grantXp ? XP_PER_CORRECT_EXERCISE : 0 };
}

export function nextPuzzleXpSolveCounts(
  counts: PuzzleXpSolveCounts,
  puzzleId: number | string,
): { counts: PuzzleXpSolveCounts; countBefore: number; countAfter: number; grantXp: boolean } {
  const key = String(puzzleId);
  const countBefore = counts[key] ?? 0;
  const countAfter = countBefore + 1;
  return {
    counts: { ...counts, [key]: countAfter },
    countBefore,
    countAfter,
    grantXp: countBefore < PUZZLE_MAX_XP_SOLVES,
  };
}

export function levelFromXpTotal(xpTotal: number): number {
  return Math.max(1, Math.floor(xpTotal / XP_PER_CORRECT_EXERCISE) + 1);
}

export function puzzleSolveFeedbackMessage(xpEarned: number): string {
  return xpEarned > 0
    ? `Puzzle solved! +${xpEarned} XP.`
    : "Puzzle solved! (no XP — limit reached for this puzzle)";
}
