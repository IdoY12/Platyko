import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { VerifyEmailBody } from "../../validators/emailVerificationValidators.js";
import {
  consumePendingRegistration,
  findPendingRegistration,
  registrationConflictMessage,
} from "../../services/auth/pendingRegistrations.js";
import { OTP_OUTCOME_ERRORS } from "../../services/auth/otpCodes.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";

export const PENDING_MISSING_MESSAGE = "No pending registration for this email. Please register again.";
export const PENDING_REPLACED_MESSAGE = "This registration was replaced by a newer one. Please register again.";

/** Turns the pending row into a real account and answers with a session, like login. */
export async function authVerifyEmailHandler(request: Request, response: Response): Promise<void> {
  const { email, code, registrationToken } = request.validatedBody as VerifyEmailBody;
  logInfo("[AUTH]", "verify-email:attempt", { email });
  try {
    const pending = await findPendingRegistration(email, registrationToken);
    if (pending === "missing" || pending === "replaced") {
      logWarn("[AUTH]", "verify-email:no-pending", { email, reason: pending });
      response.status(pending === "missing" ? 404 : 409).json({ error: pending === "missing" ? PENDING_MISSING_MESSAGE : PENDING_REPLACED_MESSAGE });
      return;
    }
    const { outcome, user } = await consumePendingRegistration(pending, code);
    if (!user) {
      logWarn("[AUTH]", "verify-email:rejected", { email, outcome });
      response.status(400).json({ error: OTP_OUTCOME_ERRORS[outcome as Exclude<typeof outcome, "ok">] });
      return;
    }
    const session = await issueSessionForUser(user);
    logInfo("[AUTH]", "verify-email:success", { userId: user.id });
    response.status(201).json(session);
  } catch (error) {
    logError("[AUTH]", error, { phase: "verify-email" });
    const conflict = registrationConflictMessage(error);
    if (conflict) {
      // The email/username was claimed (social sign-up or another verify) meanwhile; the row is useless now.
      await prisma.pendingRegistration.deleteMany({ where: { email } });
      response.status(409).json({ error: conflict });
      return;
    }
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Email verification failed" });
  }
}
