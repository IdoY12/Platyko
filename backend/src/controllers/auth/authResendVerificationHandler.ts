import type { Request, Response } from "express";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { ResendVerificationBody } from "../../validators/emailVerificationValidators.js";
import {
  findPendingRegistration,
  pendingResendCooldownSecondsLeft,
  refreshPendingRegistrationCode,
} from "../../services/auth/pendingRegistrations.js";
import { sendVerificationCodeEmail } from "../../services/auth/sendVerificationEmail.js";
import { PENDING_MISSING_MESSAGE, PENDING_REPLACED_MESSAGE } from "./authVerifyEmailHandler.js";

export async function authResendVerificationHandler(request: Request, response: Response): Promise<void> {
  const { email, registrationToken } = request.validatedBody as ResendVerificationBody;
  logInfo("[AUTH]", "resend-verification:attempt", { email });
  try {
    const pending = await findPendingRegistration(email, registrationToken);
    if (pending === "missing" || pending === "replaced") {
      logWarn("[AUTH]", "resend-verification:no-pending", { email, reason: pending });
      response.status(pending === "missing" ? 404 : 409).json({ error: pending === "missing" ? PENDING_MISSING_MESSAGE : PENDING_REPLACED_MESSAGE });
      return;
    }
    const cooldownSeconds = await pendingResendCooldownSecondsLeft(email);
    if (cooldownSeconds > 0) {
      logWarn("[AUTH]", "resend-verification:cooldown", { email, cooldownSeconds });
      response.status(429).json({
        error: `Please wait ${cooldownSeconds}s before requesting another code`,
        retryAfterSeconds: cooldownSeconds,
      });
      return;
    }
    const code = await refreshPendingRegistrationCode(email);
    const sent = await sendVerificationCodeEmail(email, code);
    if (!sent) {
      response.status(502).json({ error: "Could not send the email. Try again later." });
      return;
    }
    logInfo("[AUTH]", "resend-verification:sent", { email });
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
