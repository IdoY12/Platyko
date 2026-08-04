import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { resolveExperienceLevel } from "@project/db";
import { logError, logInfo } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import { signAccessToken, signRefreshToken } from "../../utils/sessionJwtTokens.js";
import { verifyGoogleIdToken } from "../../utils/googleIdTokenVerify.js";
import type { GoogleAuthBody } from "../../validators/authValidators.js";
import { GoogleSignInBlockedError, findOrCreateGoogleUser } from "../../services/auth/googleAccountLinking.js";
import { ensureUserProgressForLogin, touchUserLastActive } from "../../services/auth/loginSideEffects.js";
import { storeRefreshToken } from "../../utils/storeRefreshToken.js";

export async function authGoogleHandler(request: Request, response: Response): Promise<void> {
  const { idToken, ...guestSnapshot } = request.validatedBody as GoogleAuthBody;
  let email: string;
  let googleId: string;
  let name: string | undefined;
  try {
    ({ email, googleId, name } = await verifyGoogleIdToken(idToken));
  } catch {
    response.status(401).json({ error: "Invalid Google token" });
    return;
  }
  try {
    const { user, isNew } = await findOrCreateGoogleUser(googleId, email, name, guestSnapshot);
    const progress = await ensureUserProgressForLogin(user);
    await touchUserLastActive(user.id);
    const tp = { userId: user.id, email: user.email, tokenVersion: user.tokenVersion };
    const accessToken = signAccessToken(tp);
    const refreshToken = signRefreshToken(tp);
    await storeRefreshToken(user.id, refreshToken, randomUUID());
    logInfo("[AUTH]", "google:success", { userId: user.id });
    response.status(isNew ? 201 : 200).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        goal: progress.goal,
        experienceLevel: resolveExperienceLevel(progress.experienceLevel),
        dailyCommitmentMinutes: progress.dailyCommitmentMinutes ?? 15,
        notificationsEnabled: progress.notificationsEnabled ?? true,
        ...(isNew ? { blockProgress: (progress.blockProgress ?? {}) as Record<string, number> } : {}),
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof GoogleSignInBlockedError) {
      response.status(409).json({ error: error.message });
      return;
    }
    logError("[AUTH]", error, { phase: "google" });
    if (isDatabaseUnavailableError(error)) response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
    else response.status(500).json({ error: "Google sign-in failed" });
  }
}
