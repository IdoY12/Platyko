import type { PrismaClient } from "@prisma/client";
import {
  activeExperienceLevelOf,
  ensureProgressRow,
  getProgressForActiveUser,
  handleStreakQualifyingXpForUser,
  parsePuzzleXpSolveCounts,
  runSerializableWithRetry,
  type DbClient,
} from "@project/db";
import {
  levelFromXpTotal,
  MAX_XP_TOTAL,
  nextPuzzleXpSolveCounts,
  XP_PER_CORRECT_EXERCISE,
} from "@project/xp-constants";

export type AuthenticatedPuzzleSolveResult = {
  puzzleSolveCount: number;
  xpEarned?: number;
  xpTotal?: number;
  streakCurrent?: number;
};

export async function applyAuthenticatedPuzzleSolve(
  prisma: PrismaClient,
  userId: string,
  puzzleId: number,
  clientLocalDate: string | undefined,
): Promise<AuthenticatedPuzzleSolveResult> {
  return runSerializableWithRetry(prisma, async (tx: DbClient) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { puzzleXpSolveCounts: true } });
    const { counts, countAfter, grantXp } = nextPuzzleXpSolveCounts(
      parsePuzzleXpSolveCounts(user?.puzzleXpSolveCounts),
      puzzleId,
    );
    await tx.user.update({ where: { id: userId }, data: { puzzleXpSolveCounts: counts } });
    if (!clientLocalDate) return { puzzleSolveCount: countAfter };

    const level = await activeExperienceLevelOf(tx, userId);
    await ensureProgressRow(tx, userId, level);
    const progress = await getProgressForActiveUser(tx, userId);
    if (!progress) return { puzzleSolveCount: countAfter, xpEarned: 0 };

    const xpEarned = grantXp ? XP_PER_CORRECT_EXERCISE : 0;
    let xpTotal = progress.xpTotal;
    if (grantXp) {
      xpTotal = Math.min(progress.xpTotal + XP_PER_CORRECT_EXERCISE, MAX_XP_TOTAL);
      await tx.userProgress.update({
        where: { id: progress.id },
        data: { xpTotal, level: levelFromXpTotal(xpTotal) },
      });
    }
    const streakCurrent = await handleStreakQualifyingXpForUser(
      tx,
      userId,
      clientLocalDate,
      grantXp ? XP_PER_CORRECT_EXERCISE : 0,
    );
    return { puzzleSolveCount: countAfter, xpEarned, xpTotal, streakCurrent };
  });
}
