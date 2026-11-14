/**
 * GET /api/user/profile — returns the authenticated user's core profile fields.
 *
 * Responsibility: read user + active progress for the client shell.
 * Layer: backend user HTTP handlers
 * Consumers: user router
 */

import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { getProgressForActiveUser, resolveExperienceLevel } from "@project/db";
import { AUTH_ACCOUNT_SELECT, authAccountFields } from "../../utils/authAccountFields.js";

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
      activeExperienceLevel: true,
      notificationsEnabled: true,
      ...AUTH_ACCOUNT_SELECT,
    },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  const progress = await getProgressForActiveUser(prisma, req.user!.userId);
  const progressOut = progress
    ? {
        goal: progress.goal,
        experienceLevel: resolveExperienceLevel(progress.experienceLevel),
        dailyCommitmentMinutes: progress.dailyCommitmentMinutes,
        currentExerciseIndex: progress.currentExerciseIndex,
      }
    : null;

  // Never echo the credential/provider columns — only the derived flags leave the server.
  const { hashedPassword: _hash, googleId: _google, appleSub: _apple, ...publicUser } = user;
  return res.json({
    ...publicUser,
    ...authAccountFields(user),
    progress: progressOut,
  });
}
