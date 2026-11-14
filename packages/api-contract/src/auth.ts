/**
 * Sign-in providers besides email and password (PRD 14.3). An account reports the one it signed up
 * with as `authProvider`, never the provider's ids.
 */
export const AUTH_PROVIDERS = ["google", "apple", "github"] as const;
export type AuthProviderName = (typeof AUTH_PROVIDERS)[number];
