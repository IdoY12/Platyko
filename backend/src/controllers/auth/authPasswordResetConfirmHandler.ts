import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { ConfirmPasswordResetBody } from "../../validators/passwordResetValidators.js";
import { OTP_OUTCOME_ERRORS } from "../../services/auth/otpCodes.js";
import { consumePasswordResetCode } from "../../services/auth/passwordResetCodes.js";

export async function authPasswordResetConfirmHandler(request: Request, response: Response): Promise<void> {
  const { email, code, newPassword } = request.validatedBody as ConfirmPasswordResetBody;
  logInfo("[AUTH]", "password-reset-confirm:attempt", { email });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Same body as a wrong code: never reveal whether the email belongs to an account.
      response.status(400).json({ error: OTP_OUTCOME_ERRORS.missing });
      return;
    }
    const outcome = await consumePasswordResetCode(user.id, code, newPassword);
    if (outcome !== "ok") {
      logWarn("[AUTH]", "password-reset-confirm:rejected", { userId: user.id, outcome });
      response.status(400).json({ error: OTP_OUTCOME_ERRORS[outcome] });
      return;
    }
    logInfo("[AUTH]", "password-reset-confirm:success", { userId: user.id });
    response.json({ success: true });
  } catch (error) {
    logError("[AUTH]", error, { phase: "password-reset-confirm" });
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Password reset failed" });
  }
}
