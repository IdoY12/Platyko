/**
 * Derived account facts included in every auth/user payload.
 *
 * Responsibility: tell the client whether the account has a password, which social provider
 * it uses (without leaking the hash or the provider IDs) and the UI language it chose.
 * Layer: backend utils
 * Consumers: auth controllers, issueSessionForUser, user profile handler
 */

import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@project/locales";

/** The columns `authAccountFields` reads; spread into a Prisma `select`. */
export const AUTH_ACCOUNT_SELECT = { hashedPassword: true, googleId: true, appleSub: true, language: true } as const;

type AuthAccountSource = {
  hashedPassword: string | null;
  googleId: string | null;
  appleSub: string | null;
  language: string;
};

export function authAccountFields(user: AuthAccountSource): {
  hasPassword: boolean;
  authProvider: "google" | "apple" | null;
  language: Language;
} {
  return {
    hasPassword: user.hashedPassword !== null,
    authProvider: user.googleId ? "google" : user.appleSub ? "apple" : null,
    language: isLanguage(user.language) ? user.language : DEFAULT_LANGUAGE,
  };
}
