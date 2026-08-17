import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { RequestPasswordResetBody } from "../../validators/passwordResetValidators.js";
import { createPasswordResetCode, passwordResetCooldownSecondsLeft } from "../../services/auth/passwordResetCodes.js";
import { sendPasswordResetCodeEmail } from "../../services/auth/sendPasswordResetEmail.js";

/**
 * Always answers 200 with the same body — the response must never reveal
 * whether the email belongs to an account. Unknown emails and per-user
 * cooldown hits are skipped silently for the same reason. Social-only
 * accounts (no password yet) DO get a code: confirming it sets their first
 * password — the standard email-OTP "add a password" pattern.
 */
export async function authPasswordResetRequestHandler(request: Request, response: Response): Promise<void> {
  const { email } = request.validatedBody as RequestPasswordResetBody;
  logInfo("[AUTH]", "password-reset-request:attempt", { email });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && (await passwordResetCooldownSecondsLeft(user.id)) === 0) {
      const code = await createPasswordResetCode(user.id);
      await sendPasswordResetCodeEmail(user.email, code);
      logInfo("[AUTH]", "password-reset-request:sent", { userId: user.id });
    }
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
