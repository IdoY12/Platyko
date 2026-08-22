/**
 * GET /api/user/preferences — returns learning preferences for settings UI.
 *
 * Responsibility: map User notification setting + active UserProgress row into preference DTO.
 * Layer: backend user HTTP handlers
 * Consumers: user router
 */

import type { Response } from "express";
import { prisma, getProgressForActiveUser, resolveExperienceLevel } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";

export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { notificationsEnabled: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const progress = await getProgressForActiveUser(prisma, req.user!.userId);

  return res.json({
    userGoal: progress?.goal ?? null,
    experienceLevel: resolveExperienceLevel(progress?.experienceLevel),
    dailyGoalMinutes: progress?.dailyCommitmentMinutes ?? null,
    notificationsEnabled: user.notificationsEnabled,
  });
}
