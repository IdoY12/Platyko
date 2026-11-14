/**
 * Derived account facts included in every auth/user payload.
 *
 * Responsibility: tell the client whether the account has a password, which social provider
 * it uses (without leaking the hash or the provider IDs) and the UI language it chose.
 * Layer: backend utils
 * Consumers: auth controllers, issueSessionForUser, user profile handler
 */

import type { AuthProviderName } from "@project/api-contract";
import type { AuthProvider } from "@project/db";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@project/locales";

/** What `authAccountFields` reads; spread into a Prisma `select`. */
export const AUTH_ACCOUNT_SELECT = { hashedPassword: true, language: true, identities: { select: { provider: true }, orderBy: { createdAt: "asc" } } } as const;

type AuthAccountSource = { hashedPassword: string | null; language: string; identities: { provider: AuthProvider }[] };

export const PROVIDER_NAME: Record<AuthProvider, AuthProviderName> = { GOOGLE: "google", APPLE: "apple", GITHUB: "github" };

export function authAccountFields(user: AuthAccountSource): { hasPassword: boolean; authProvider: AuthProviderName | null; language: Language } {
  const first = user.identities[0];
  return {
    hasPassword: user.hashedPassword !== null,
    authProvider: first ? PROVIDER_NAME[first.provider] : null,
    language: isLanguage(user.language) ? user.language : DEFAULT_LANGUAGE,
  };
}
