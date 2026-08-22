/**
 * PATCH /api/user/preferences — updates goals, level band, reminders, and active track.
 *
 * Responsibility: write notificationsEnabled on User; upsert UserProgress when a level is sent.
 * Layer: backend user HTTP handlers
 * Consumers: user router
 */

import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { getProgressForActiveUser, resolveExperienceLevel } from "@project/db";
import { logInfo } from "../../utils/logger.js";
import type { PatchPreferencesBody } from "../../validators/userValidators.js";

export async function patchPreferences(req: AuthenticatedRequest, res: Response) {
  logInfo("[AUTH]", "preferences:update-attempt", { userId: req.user?.userId });
  const data = req.validatedBody as PatchPreferencesBody;
  const userId = req.user!.userId;
  const level = data.experienceLevel;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.notificationsEnabled !== undefined ? { notificationsEnabled: data.notificationsEnabled } : {}),
      ...(level ? { activeExperienceLevel: level } : {}),
    },
  });

  const progress = level
    ? await prisma.userProgress.upsert({
        where: { userId_experienceLevel: { userId, experienceLevel: level } },
        create: {
          userId,
          experienceLevel: level,
          goal: data.goal,
          dailyCommitmentMinutes: data.dailyCommitmentMinutes,
        },
        update: {
          goal: data.goal,
          dailyCommitmentMinutes: data.dailyCommitmentMinutes,
        },
      })
    : await getProgressForActiveUser(prisma, userId);

  return res.json({
    goal: progress?.goal ?? null,
    experienceLevel: resolveExperienceLevel(progress?.experienceLevel ?? user.activeExperienceLevel),
    dailyCommitmentMinutes: progress?.dailyCommitmentMinutes ?? 15,
    notificationsEnabled: user.notificationsEnabled,
  });
}
