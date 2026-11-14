import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { USERNAME_TAKEN_MESSAGE } from "@project/user-credentials";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import type { RegisterBody } from "../../validators/authValidators.js";
import { createPendingRegistration, pendingResendCooldownSecondsLeft, purgeStalePendingRegistrations } from "../../services/auth/pendingRegistrations.js";
import { EMAIL_SEND_FAILED_MESSAGE, sendVerificationCodeEmail } from "../../services/auth/sendVerificationEmail.js";
import { otpCooldownReply } from "../../services/auth/otpCodes.js";
import { answerRegistrationForExistingEmail } from "../../services/auth/registrationForExistingEmail.js";

/**
 * Stores a pending registration and emails its code. No User row exists until
 * /auth/verify-email succeeds, so an abandoned sign-up never reserves the email
 * or username. A repeat register for the same email replaces the pending row. An address that
 * already has an account gets the same reply as a new one (see registrationForExistingEmail).
 */
export async function authRegisterHandler(request: Request, response: Response): Promise<void> {
  const { email, username, password, ...snapshot } = request.validatedBody as RegisterBody;
  logInfo("[AUTH]", "register:attempt", { email, username });
  try {
    await purgeStalePendingRegistrations();
    const [emailOwner, usernameOwner] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findFirst({ where: { usernameLower: username.toLowerCase() }, select: { email: true } }),
    ]);
    // Usernames are public, so a taken one is said plainly, unless the address's own account holds it.
    if (usernameOwner && usernameOwner.email !== email) {
      logWarn("[AUTH]", "register:taken", { email, username, field: "username" });
      response.status(409).json({ error: USERNAME_TAKEN_MESSAGE });
      return;
    }
    if (emailOwner) {
      logWarn("[AUTH]", "register:taken", { email, username, field: "email" });
      const answer = await answerRegistrationForExistingEmail(email, password);
      if ("cooldownSeconds" in answer) response.status(429).json(otpCooldownReply(answer.cooldownSeconds));
      else if (!answer.emailSent) response.status(502).json({ error: EMAIL_SEND_FAILED_MESSAGE });
      else {
        response.locals.codeEmailQueued = true;
        response.status(202).json({ email, registrationToken: answer.registrationToken });
      }
      return;
    }
    // A repeat register for the same address within the cooldown must not mail again or cancel the
    // sign-up that is in progress (inbox bombing).
    const cooldownSeconds = await pendingResendCooldownSecondsLeft(email);
    if (cooldownSeconds > 0) {
      response.status(429).json(otpCooldownReply(cooldownSeconds));
      return;
    }
    const { code, registrationToken } = await createPendingRegistration({ email, username, password, snapshot });
    if (!(await sendVerificationCodeEmail(email, code))) {
      response.status(502).json({ error: EMAIL_SEND_FAILED_MESSAGE });
      return;
    }
    logInfo("[AUTH]", "register:pending", { email });
    response.locals.codeEmailQueued = true;
    response.status(202).json({ email, registrationToken });
  } catch (error) {
    logError("[AUTH]", error, { phase: "register" });
    const reply = unexpectedErrorReply(error, "Registration failed");
    response.status(reply.status).json(reply.body);
  }
}
