import type { Request, Response } from "express";
import { logError, logInfo } from "../../utils/logger.js";
import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import { verifyAppleIdentityToken } from "../../utils/appleIdTokenVerify.js";
import type { AppleAuthBody } from "../../validators/appleAuthValidators.js";
import { SocialSignInBlockedError, findOrCreateSocialUser } from "../../services/auth/socialAccountLinking.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";

export async function authAppleHandler(request: Request, response: Response): Promise<void> {
  const { identityToken, fullName, ...guestSnapshot } = request.validatedBody as AppleAuthBody;
  let appleSub: string;
  let tokenEmail: string | undefined;
  try {
    ({ appleSub, email: tokenEmail } = await verifyAppleIdentityToken(identityToken));
  } catch {
    response.status(401).json({ error: "Invalid Apple token" });
    return;
  }
  try {
    // Only the verified token's email claim is trusted (see appleAuthValidators for why).
    const { user, isNew } = await findOrCreateSocialUser("apple", appleSub, tokenEmail, fullName, guestSnapshot);
    const session = await issueSessionForUser(user, isNew);
    logInfo("[AUTH]", "apple:success", { userId: user.id });
    response.status(isNew ? 201 : 200).json(session);
  } catch (error) {
    if (error instanceof SocialSignInBlockedError) {
      response.status(409).json({ error: error.message });
      return;
    }
    logError("[AUTH]", error, { phase: "apple" });
    const reply = unexpectedErrorReply(error, "Apple sign-in failed");
    response.status(reply.status).json(reply.body);
  }
}
