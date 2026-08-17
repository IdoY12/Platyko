import type { Request, Response } from "express";
import { prisma } from "@project/db";
import type { User } from "@prisma/client";
import { logError, logInfo } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { RequestPasswordResetBody } from "../../validators/passwordResetValidators.js";
import { createPasswordResetCode, passwordResetCooldownSecondsLeft } from "../../services/auth/passwordResetCodes.js";
import { sendPasswordResetCodeEmail } from "../../services/auth/sendPasswordResetEmail.js";

/** Runs after the response is sent; failures are logged only — the 200 already went out. */
async function issueResetCodeInBackground(user: User): Promise<void> {
  try {
    if ((await passwordResetCooldownSecondsLeft(user.id)) > 0) return;
    const code = await createPasswordResetCode(user.id);
    await sendPasswordResetCodeEmail(user.email, code);
    logInfo("[AUTH]", "password-reset-request:sent", { userId: user.id });
  } catch (error) {
    logError("[AUTH]", error, { phase: "password-reset-request:background" });
  }
}

/**
 * Always answers 200 with the same body — the response must never reveal
 * whether the email belongs to an account. Unknown emails and per-user
 * cooldown hits are skipped silently for the same reason, and the code
 * creation + email send run AFTER the response so existing and unknown
 * emails answer in the same time (no timing enumeration). Social-only
 * accounts (no password yet) DO get a code: confirming it sets their first
 * password — the standard email-OTP "add a password" pattern.
 */
export async function authPasswordResetRequestHandler(request: Request, response: Response): Promise<void> {
  const { email } = request.validatedBody as RequestPasswordResetBody;
  logInfo("[AUTH]", "password-reset-request:attempt", { email });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) void issueResetCodeInBackground(user);
    response.json({ sent: true });
  } catch (error) {
    logError("[AUTH]", error, { phase: "password-reset-request" });
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Could not process the request" });
  }
}
