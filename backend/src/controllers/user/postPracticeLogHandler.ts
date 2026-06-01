/**
 * POST /api/user/practice-log — increments daily practice seconds.
 *
 * Responsibility: update active UserProgress row practice counters only.
 * Layer: backend user HTTP handlers
 * Consumers: user router
 */

import type { Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma, getProgressForActiveUser } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { logInfo } from "../../utils/logger.js";
import type { PostPracticeLogBody } from "../../validators/userValidators.js";

export async function postPracticeLog(req: AuthenticatedRequest, res: Response) {
  const { dateKey, practicedSeconds } = req.validatedBody as PostPracticeLogBody;
  logInfo("[TASKS]", "practice-log:write-attempt", { userId: req.user?.userId, dateKey });

  const userId = req.user!.userId;
  let nextSeconds: number | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      nextSeconds = await prisma.$transaction(async (tx) => {
        const progress = await getProgressForActiveUser(tx, userId);
        if (!progress) return null;
        const sameDay = progress.practiceLogDateKey === dateKey;
        const seconds = sameDay ? progress.practiceLogSeconds + practicedSeconds : practicedSeconds;
        await tx.userProgress.update({
          where: { id: progress.id },
          data: { practiceLogDateKey: dateKey, practiceLogSeconds: seconds },
        });
        return seconds;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 2) continue;
      throw e;
    }
  }

  if (nextSeconds === null) {
    return res.status(404).json({ error: "Progress not found" });
  }

  logInfo("[TASKS]", "practice-log:write-success", { userId: req.user?.userId, practicedSeconds: nextSeconds });
  return res.json({ practicedSeconds: nextSeconds });
}
