/**
 * GET /api/user/progress-summary — aggregates XP, streak, duel stats.
 *
 * Responsibility: parallel reads for dashboard cards on the mobile home screen.
 * Query `localDate` (YYYY-MM-DD, client local calendar) is required so streak open rules use the user's day boundary.
 * Layer: backend user HTTP handlers
 * Consumers: user router
 */

import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import type { Response } from "express";
import { getProgressForActiveUser, handleStreakAppOpenForUser, prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { logError } from "../../utils/logger.js";
import type { ProgressSummaryQuery } from "../../validators/userValidators.js";

export async function getProgressSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const { localDate } = req.validatedQuery as ProgressSummaryQuery;
    const userId = req.user!.userId;

    await handleStreakAppOpenForUser(prisma, userId, localDate);

    const progress = await getProgressForActiveUser(prisma, userId);

    const [duelWins, duelLosses] = await Promise.all([
      prisma.duelSession.count({ where: { winnerId: userId } }),
      prisma.duelSession.count({
        where: {
          AND: [
            { OR: [{ player1Id: userId }, { player2Id: userId }] },
            { winnerId: { not: null } },
            { NOT: { winnerId: userId } },
          ],
        },
      }),
    ]);

    return res.json({
      xpTotal: progress?.xpTotal ?? 0,
      level: progress?.level ?? 1,
      streakCurrent: progress?.streakCurrent ?? 0,
      streakLastActivityDate: progress?.streakLastActivityDate ?? null,
      streakLastCheckedDate: progress?.streakLastCheckedDate ?? null,
      lessonsCompleted: progress?.currentExerciseIndex ?? 0,
      duelWins,
      duelLosses,
    });
  } catch (error) {
    logError("[USER]", error, { phase: "progress-summary", userId: req.user?.userId });
    const reply = unexpectedErrorReply(error, "Failed to load progress summary");
    return res.status(reply.status).json(reply.body);
  }
}
