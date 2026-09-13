import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { EMAIL_TAKEN_MESSAGE, USERNAME_TAKEN_MESSAGE } from "@project/user-credentials";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import type { RegisterBody } from "../../validators/authValidators.js";
import { createPendingRegistration, purgeStalePendingRegistrations } from "../../services/auth/pendingRegistrations.js";
import { sendVerificationCodeEmail } from "../../services/auth/sendVerificationEmail.js";

/**
 * Stores a pending registration and emails its code. No User row exists until
 * /auth/verify-email succeeds, so an abandoned sign-up never reserves the email
 * or username. A repeat register for the same email replaces the pending row.
 */
export async function authRegisterHandler(request: Request, response: Response): Promise<void> {
  const { email, username, password, ...snapshot } = request.validatedBody as RegisterBody;
  logInfo("[AUTH]", "register:attempt", { email, username });
  try {
    await purgeStalePendingRegistrations();
    const taken = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { email: true } });
    if (taken) {
      logWarn("[AUTH]", "register:taken", { email, username, field: taken.email === email ? "email" : "username" });
      response.status(409).json({ error: taken.email === email ? EMAIL_TAKEN_MESSAGE : USERNAME_TAKEN_MESSAGE });
      return;
    }
    const { code, registrationToken } = await createPendingRegistration({ email, username, password, snapshot });
    await sendVerificationCodeEmail(email, code);
    logInfo("[AUTH]", "register:pending", { email });
    response.status(202).json({ email, registrationToken });
  } catch (error) {
    logError("[AUTH]", error, { phase: "register" });
    if (isDatabaseUnavailableError(error)) {
      response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
      return;
    }
    response.status(500).json({ error: "Registration failed" });
  }
}
