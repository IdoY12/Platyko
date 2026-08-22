import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import { comparePassword } from "../../utils/passwordHashing.js";
import { signAccessToken, signRefreshToken } from "../../utils/sessionJwtTokens.js";
import { resolveExperienceLevel } from "@project/db";
import type { LoginBody } from "../../validators/authValidators.js";
import { ensureUserProgressForLogin, touchUserLastActive } from "../../services/auth/loginSideEffects.js";
import { storeRefreshToken } from "../../utils/storeRefreshToken.js";

export async function authLoginHandler(request: Request, response: Response): Promise<void> {
  const { email, password } = request.validatedBody as LoginBody;
  logInfo("[AUTH]", "login:attempt", { email });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logWarn("[AUTH]", "login:user-not-found", { email });
      response.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.hashedPassword) {
      logWarn("[AUTH]", "login:oauth-only-account", { email });
      response.status(401).json({ error: "Sign in with Google for this account" });
      return;
    }
    const isPasswordValid = await comparePassword(password, user.hashedPassword);

    if (!isPasswordValid) {
      logWarn("[AUTH]", "login:invalid-password", { userId: user.id });
      response.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.emailVerified) {
      logWarn("[AUTH]", "login:email-not-verified", { userId: user.id });
      response.status(403).json({ error: "Verify your email to continue", code: "EMAIL_NOT_VERIFIED" });
      return;
    }
    const progress = await ensureUserProgressForLogin(user);
    await touchUserLastActive(user.id);
    const tokenPayload = { userId: user.id, email: user.email, tokenVersion: user.tokenVersion };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    await storeRefreshToken(user.id, refreshToken, randomUUID());
    logInfo("[AUTH]", "login:success", { userId: user.id });
    response.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        goal: progress.goal,
        experienceLevel: resolveExperienceLevel(progress.experienceLevel),
        dailyCommitmentMinutes: progress.dailyCommitmentMinutes ?? 15,
        notificationsEnabled: user.notificationsEnabled,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logError("[AUTH]", error, { phase: "login" });

    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Login failed" });
  }
}
