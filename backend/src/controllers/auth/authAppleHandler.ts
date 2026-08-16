import type { Request, Response } from "express";
import { logError, logInfo } from "../../utils/logger.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../../utils/dbErrors.js";
import { verifyAppleIdentityToken } from "../../utils/appleIdTokenVerify.js";
import type { AppleAuthBody } from "../../validators/appleAuthValidators.js";
import { AppleSignInBlockedError, findOrCreateAppleUser } from "../../services/auth/appleAccountLinking.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";

export async function authAppleHandler(request: Request, response: Response): Promise<void> {
  const { identityToken, fullName, email: bodyEmail, ...guestSnapshot } = request.validatedBody as AppleAuthBody;
  let appleSub: string;
  let tokenEmail: string | undefined;
  try {
    ({ appleSub, email: tokenEmail } = await verifyAppleIdentityToken(identityToken));
  } catch {
    response.status(401).json({ error: "Invalid Apple token" });
    return;
  }
  try {
    // The verified token's email claim is authoritative; the body email (from Apple's first
    // authorization) is only a fallback and, per the linking rules, can never hijack an account.
    const { user, isNew } = await findOrCreateAppleUser(appleSub, tokenEmail ?? bodyEmail, fullName, guestSnapshot);
    const session = await issueSessionForUser(user, isNew);
    logInfo("[AUTH]", "apple:success", { userId: user.id });
    response.status(isNew ? 201 : 200).json(session);
  } catch (error) {
    if (error instanceof AppleSignInBlockedError) {
      response.status(409).json({ error: error.message });
      return;
    }
    logError("[AUTH]", error, { phase: "apple" });
    if (isDatabaseUnavailableError(error)) response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
    else response.status(500).json({ error: "Apple sign-in failed" });
  }
}
