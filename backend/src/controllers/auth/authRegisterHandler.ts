import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { logError, logInfo } from "../../utils/logger.js";
import { USERNAME_TAKEN_MESSAGE } from "@project/user-credentials";
import {
  DATABASE_UNAVAILABLE_MESSAGE,
  isDatabaseUnavailableError,
  isUniqueConstraintError,
} from "../../utils/dbErrors.js";
import { signAccessToken, signRefreshToken } from "../../utils/sessionJwtTokens.js";
import type { RegisterBody } from "../../validators/authValidators.js";
import { createRegisteredUserWithDefaults } from "../../services/auth/registerUser.js";
import { storeRefreshToken } from "../../utils/storeRefreshToken.js";

export async function authRegisterHandler(request: Request, response: Response): Promise<void> {
  const { email, username, password } = request.validatedBody as RegisterBody;
  logInfo("[AUTH]", "register:attempt", { email, username });
  try {
    const user = await createRegisteredUserWithDefaults({ email, username, password });
    const tokenPayload = { userId: user.id, email: user.email, tokenVersion: user.tokenVersion };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    await storeRefreshToken(user.id, refreshToken, randomUUID());
    logInfo("[AUTH]", "register:success", { userId: user.id, email: user.email });
    response.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        goal: null,
        experienceLevel: null,
        dailyCommitmentMinutes: 15,
        notificationsEnabled: true,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logError("[AUTH]", error, { phase: "register" });

    if (isUniqueConstraintError(error, "username")) {
      response.status(409).json({ error: USERNAME_TAKEN_MESSAGE });
      return;
    }

    if (isUniqueConstraintError(error, "email")) {
      response.status(409).json({ error: "Email already exists" });
      return;
    }

    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Registration failed" });
  }
}
