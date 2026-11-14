import type { Response } from "express";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { linkGitHub, unlinkGitHub } from "../../services/auth/githubAccount.js";
import { githubProfileFromCode, GitHubSignInError } from "../../services/auth/githubOAuth.js";
import type { GitHubAuthBody } from "../../validators/authValidators.js";

/** `POST /api/user/github`: links GitHub to the signed-in account. */
export async function postGitHubLink(req: AuthenticatedRequest, res: Response) {
  const { code, codeVerifier, redirectUri } = req.validatedBody as GitHubAuthBody;
  try {
    const outcome = await linkGitHub(req.user!.userId, await githubProfileFromCode(code, codeVerifier, redirectUri));
    if (outcome === "taken") res.status(409).json({ error: "This GitHub account is linked to another Platyko account." });
    else res.status(204).send();
  } catch (error) {
    if (!(error instanceof GitHubSignInError)) throw error;
    res.status(401).json({ error: "Invalid GitHub sign-in" });
  }
}

/** `DELETE /api/user/github`: disconnects GitHub and deletes all of its data (criterion 20.8). */
export async function deleteGitHubLink(req: AuthenticatedRequest, res: Response) {
  if ((await unlinkGitHub(req.user!.userId)) === "only-sign-in") res.status(409).json({ error: "This account signs in only with GitHub. Set a password first." });
  else res.status(204).send();
}
