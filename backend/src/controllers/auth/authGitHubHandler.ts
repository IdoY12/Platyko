import type { Request, Response } from "express";
import { logError, logInfo } from "../../utils/logger.js";
import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import type { GitHubAuthBody } from "../../validators/authValidators.js";
import { githubClientId, githubProfileFromCode, GitHubSignInError } from "../../services/auth/githubOAuth.js";
import { SocialSignInBlockedError, findOrCreateSocialUser } from "../../services/auth/socialAccountLinking.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";
import { prisma } from "@project/db";

/** `GET /api/auth/github/config`: the public client id the app signs in with, or null while it is off (H7). */
export function authGitHubConfigHandler(_request: Request, response: Response): void {
  response.json({ clientId: githubClientId() });
}

/** Sign in or sign up with GitHub (PRD 14.3): the code is exchanged here, with the secret the app never holds. */
export async function authGitHubHandler(request: Request, response: Response): Promise<void> {
  const { code, codeVerifier, redirectUri, ...guestSnapshot } = request.validatedBody as GitHubAuthBody;
  try {
    const profile = await githubProfileFromCode(code, codeVerifier, redirectUri);
    const { user, isNew } = await findOrCreateSocialUser("github", profile.subject, profile.email, profile.name ?? profile.login, guestSnapshot);
    await prisma.user.update({ where: { id: user.id }, data: { githubLogin: profile.login } });
    const session = await issueSessionForUser(user, isNew);
    logInfo("[AUTH]", "github:success", { userId: user.id });
    response.status(isNew ? 201 : 200).json(session);
  } catch (error) {
    if (error instanceof GitHubSignInError) {
      response.status(401).json({ error: "Invalid GitHub sign-in" });
      return;
    }
    if (error instanceof SocialSignInBlockedError) {
      response.status(409).json({ error: error.message });
      return;
    }
    logError("[AUTH]", error, { phase: "github" });
    const reply = unexpectedErrorReply(error, "GitHub sign-in failed");
    response.status(reply.status).json(reply.body);
  }
}
