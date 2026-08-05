import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { ResendVerificationBody } from "../../validators/emailVerificationValidators.js";
import {
  createVerificationCode,
  resendCooldownSecondsLeft,
} from "../../services/auth/emailVerificationCodes.js";
import { sendVerificationCodeEmail } from "../../services/auth/sendVerificationEmail.js";

export async function authResendVerificationHandler(request: Request, response: Response): Promise<void> {
  const { email } = request.validatedBody as ResendVerificationBody;
  logInfo("[AUTH]", "resend-verification:attempt", { email });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      response.status(404).json({ error: "Account not found" });
      return;
    }
    if (user.emailVerified) {
      response.status(409).json({ error: "Email is already verified. Please sign in." });
      return;
    }
    const cooldownSeconds = await resendCooldownSecondsLeft(user.id);
    if (cooldownSeconds > 0) {
      logWarn("[AUTH]", "resend-verification:cooldown", { userId: user.id, cooldownSeconds });
      response.status(429).json({
        error: `Please wait ${cooldownSeconds}s before requesting another code`,
        retryAfterSeconds: cooldownSeconds,
      });
      return;
    }
    const code = await createVerificationCode(user.id);
    const sent = await sendVerificationCodeEmail(user.email, code);
    if (!sent) {
      response.status(502).json({ error: "Could not send the email. Try again later." });
      return;
    }
    logInfo("[AUTH]", "resend-verification:sent", { userId: user.id });
    response.json({ sent: true });
  } catch (error) {
    logError("[AUTH]", error, { phase: "resend-verification" });
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Could not resend the code" });
  }
}
