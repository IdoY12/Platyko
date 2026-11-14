import { randomUUID } from "crypto";
import type { User } from "@prisma/client";
import { prisma, resolveExperienceLevel } from "@project/db";
import { authAccountFields } from "../../utils/authAccountFields.js";
import { signAccessToken, signRefreshToken } from "../../utils/sessionJwtTokens.js";
import { storeRefreshToken } from "../../utils/storeRefreshToken.js";
import { ensureUserProgressForLogin, touchUserLastActive } from "./loginSideEffects.js";

/** Runs login side effects and builds the same session payload /auth/login returns. */
export async function issueSessionForUser(user: User, includeBlockProgress = false) {
  const progress = await ensureUserProgressForLogin(user);
  const identities = await prisma.authIdentity.findMany({ where: { userId: user.id }, select: { provider: true }, orderBy: { createdAt: "asc" } });
  await touchUserLastActive(user.id);
  const tokenPayload = { userId: user.id, email: user.email, tokenVersion: user.tokenVersion };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  await storeRefreshToken(user.id, refreshToken, randomUUID());
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      goal: progress.goal,
      experienceLevel: resolveExperienceLevel(progress.experienceLevel),
      dailyCommitmentMinutes: progress.dailyCommitmentMinutes ?? 15,
      notificationsEnabled: user.notificationsEnabled,
      ...authAccountFields({ ...user, identities }),
      ...(includeBlockProgress ? { blockProgress: (progress.blockProgress ?? {}) as Record<string, number> } : {}),
    },
    accessToken,
    refreshToken,
  };
}
