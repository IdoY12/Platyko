import config from "config";
import { normalizeEmail } from "@project/user-credentials";

/** GitHub sign-in (PRD 14.3), off until an OAuth app's id and secret are configured (H7). */
type GitHubConfig = { enabled: boolean; clientId: string; clientSecret: string };
const TIMEOUT_MS = 8000;

export type GitHubProfile = { subject: string; login: string; name?: string; email: string | undefined };
export class GitHubSignInError extends Error {}

function settings(): GitHubConfig | null {
  const github = config.get<GitHubConfig>("app.github");
  return github.enabled && github.clientId && github.clientSecret ? github : null;
}

/** The public client id the app starts the sign-in with, or null while GitHub sign-in is off. */
export function githubClientId(): string | null {
  return settings()?.clientId ?? null;
}

async function getJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new GitHubSignInError(`GitHub answered ${response.status}`);
  return (await response.json()) as T;
}

/**
 * Exchanges the app's authorization code on the server, where the client secret lives, reads the
 * profile and the primary verified email, and drops the GitHub token: nothing of it is stored.
 */
export async function githubProfileFromCode(code: string, codeVerifier: string, redirectUri: string): Promise<GitHubProfile> {
  const github = settings();
  if (!github) throw new GitHubSignInError("GitHub sign-in is off");
  const { access_token: token } = await getJson<{ access_token?: string }>("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: github.clientId, client_secret: github.clientSecret, code, code_verifier: codeVerifier, redirect_uri: redirectUri }),
  });
  if (!token) throw new GitHubSignInError("GitHub did not issue a token");
  const headers = { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "user-agent": "Platyko" };
  const [user, emails] = await Promise.all([
    getJson<{ id: number; login: string; name: string | null }>("https://api.github.com/user", { headers }),
    getJson<{ email: string; primary: boolean; verified: boolean }[]>("https://api.github.com/user/emails", { headers }),
  ]);
  const primary = emails.find((entry) => entry.primary && entry.verified);
  return { subject: String(user.id), login: user.login, name: user.name ?? undefined, email: primary ? normalizeEmail(primary.email) : undefined };
}
