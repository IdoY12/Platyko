import type { Request, Response } from "express";
import { logError, logInfo } from "../../utils/logger.js";
import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import { verifyGoogleIdToken } from "../../utils/googleIdTokenVerify.js";
import type { GoogleAuthBody } from "../../validators/authValidators.js";
import { SocialSignInBlockedError, findOrCreateSocialUser } from "../../services/auth/socialAccountLinking.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";

export async function authGoogleHandler(request: Request, response: Response): Promise<void> {
  const { idToken, ...guestSnapshot } = request.validatedBody as GoogleAuthBody;
  let email: string;
  let googleId: string;
  let name: string | undefined;
  try {
    ({ email, googleId, name } = await verifyGoogleIdToken(idToken));
  } catch {
    response.status(401).json({ error: "Invalid Google token" });
    return;
  }
  try {
    const { user, isNew } = await findOrCreateSocialUser("google", googleId, email, name, guestSnapshot);
    const session = await issueSessionForUser(user, isNew);
    logInfo("[AUTH]", "google:success", { userId: user.id });
    response.status(isNew ? 201 : 200).json(session);
  } catch (error) {
    if (error instanceof SocialSignInBlockedError) {
      response.status(409).json({ error: error.message });
      return;
    }
    logError("[AUTH]", error, { phase: "google" });
    const reply = unexpectedErrorReply(error, "Google sign-in failed");
    response.status(reply.status).json(reply.body);
  }
}
