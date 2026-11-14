/**
 * Sign-in providers besides email and password (PRD 14.3). An account reports the one it signed up
 * with as `authProvider`, never the provider's ids.
 */
export const AUTH_PROVIDERS = ["google", "apple", "github"] as const;
export type AuthProviderName = (typeof AUTH_PROVIDERS)[number];

/** The only permissions GitHub is asked for: the profile and the email addresses (criterion 20.8). */
export const GITHUB_SCOPES = ["read:user", "user:email"] as const;
/** `POST /auth/github` and `POST /user/github`: the authorization code the server exchanges with its secret. */
export type GitHubAuthRequest = { code: string; codeVerifier: string; redirectUri: string };
