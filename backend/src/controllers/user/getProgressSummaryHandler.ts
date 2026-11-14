/**
 * GET /api/user/progress-summary — the account's XP, level and streak.
 *
 * Responsibility: the numbers the app restores after sign-in and on returning to the foreground.
 * Query `localDate` (YYYY-MM-DD, client local calendar) is required so streak open rules use the user's day boundary.
 * Layer: backend user HTTP handlers
 * Consumers: user router
 */

import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import type { Response } from "express";
import { getProgressForActiveUser, handleStreakAppOpenForUser, prisma, runSerializableWithRetry } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { logError } from "../../utils/logger.js";
import type { ProgressSummaryQuery } from "../../validators/userValidators.js";

export async function getProgressSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const { localDate } = req.validatedQuery as ProgressSummaryQuery;
    const userId = req.user!.userId;

    // Same isolation as the XP writes, so a concurrent qualifying answer can never be overwritten here.
    await runSerializableWithRetry(prisma, (tx) => handleStreakAppOpenForUser(tx, userId, localDate));

    const progress = await getProgressForActiveUser(prisma, userId);

    return res.json({
      xpTotal: progress?.xpTotal ?? 0,
      level: progress?.level ?? 1,
      streakCurrent: progress?.streakCurrent ?? 0,
      streakLastActivityDate: progress?.streakLastActivityDate ?? null,
      streakLastCheckedDate: progress?.streakLastCheckedDate ?? null,
    });
  } catch (error) {
    logError("[USER]", error, { phase: "progress-summary", userId: req.user?.userId });
    const reply = unexpectedErrorReply(error, "Failed to load progress summary");
    return res.status(reply.status).json(reply.body);
  }
}
