import type { Request, Response } from "express";
import { logError, logInfo } from "../../utils/logger.js";
import { USERNAME_TAKEN_MESSAGE } from "@project/user-credentials";
import {
  DATABASE_UNAVAILABLE_MESSAGE,
  isDatabaseUnavailableError,
  isUniqueConstraintError,
} from "../../utils/dbErrors.js";
import type { RegisterBody } from "../../validators/authValidators.js";
import { createRegisteredUserWithDefaults } from "../../services/auth/registerUser.js";
import { createVerificationCode } from "../../services/auth/emailVerificationCodes.js";
import { sendVerificationCodeEmail } from "../../services/auth/sendVerificationEmail.js";

export async function authRegisterHandler(request: Request, response: Response): Promise<void> {
  const {
    email, username, password, experienceLevel, goal, dailyCommitmentMinutes, blockProgress,
    notificationsEnabled, xpTotal, streakCurrent, streakLastActivityDate, streakLastCheckedDate, puzzleXpSolveCounts,
  } = request.validatedBody as RegisterBody;
  logInfo("[AUTH]", "register:attempt", { email, username });
  try {
    const user = await createRegisteredUserWithDefaults({
      email, username, password, experienceLevel, goal, dailyCommitmentMinutes, blockProgress,
      notificationsEnabled, xpTotal, streakCurrent, streakLastActivityDate, streakLastCheckedDate, puzzleXpSolveCounts,
    });
    // No session tokens yet: the account stays locked until /auth/verify-email succeeds.
    const verificationCode = await createVerificationCode(user.id);
    await sendVerificationCodeEmail(user.email, verificationCode);
    logInfo("[AUTH]", "register:success", { userId: user.id, email: user.email });
    const activeLevel = experienceLevel ?? "JUNIOR";
    response.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        goal: goal ?? null,
        experienceLevel: experienceLevel ?? null,
        dailyCommitmentMinutes: dailyCommitmentMinutes ?? 15,
        notificationsEnabled: notificationsEnabled ?? true,
        blockProgress: blockProgress?.[activeLevel] ?? {},
      },
      requiresEmailVerification: true,
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
