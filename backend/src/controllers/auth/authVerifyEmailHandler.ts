import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { VerifyEmailBody } from "../../validators/emailVerificationValidators.js";
import {
  consumeVerificationCode,
  type VerificationOutcome,
} from "../../services/auth/emailVerificationCodes.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";

const OUTCOME_ERRORS: Record<Exclude<VerificationOutcome, "ok">, string> = {
  invalid: "Incorrect code. Please try again.",
  expired: "This code has expired. Request a new one.",
  locked: "Too many wrong attempts. Request a new code.",
  missing: "No active code for this account. Request a new one.",
};

export async function authVerifyEmailHandler(request: Request, response: Response): Promise<void> {
  const { email, code } = request.validatedBody as VerifyEmailBody;
  logInfo("[AUTH]", "verify-email:attempt", { email });
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
    const outcome = await consumeVerificationCode(user.id, code);
    if (outcome !== "ok") {
      logWarn("[AUTH]", "verify-email:rejected", { userId: user.id, outcome });
      response.status(400).json({ error: OUTCOME_ERRORS[outcome] });
      return;
    }
    const session = await issueSessionForUser(user);
    logInfo("[AUTH]", "verify-email:success", { userId: user.id });
    response.json(session);
  } catch (error) {
    logError("[AUTH]", error, { phase: "verify-email" });
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Email verification failed" });
  }
}
