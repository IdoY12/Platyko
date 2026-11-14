import type { AuthProviderName } from "@project/api-contract";
import { prisma, type AuthProvider, type User } from "@project/db";
import { createSocialUserWithProgress } from "./createSocialUser.js";
import type { GuestSnapshot } from "./guestSnapshotMigration.js";

export class SocialSignInBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialSignInBlockedError";
  }
}

const PROVIDER: Record<AuthProviderName, AuthProvider> = { google: "GOOGLE", apple: "APPLE", github: "GITHUB" };
export const PROVIDER_LABEL: Record<AuthProvider, { account: string; signIn: string }> = {
  GOOGLE: { account: "Google account", signIn: "Google" },
  APPLE: { account: "Apple ID", signIn: "Apple" },
  GITHUB: { account: "GitHub account", signIn: "GitHub" },
};

/** Google always shares a verified email; Apple only on the first authorization; GitHub only a verified primary one. */
const NO_EMAIL_MESSAGE: Record<AuthProviderName, string> = {
  google: "Google did not share an email for this account.",
  apple: "Apple did not share an email for this account. In Settings > Apple ID > Sign-In & Security, remove this app and try again.",
  github: "GitHub did not share a verified email. Verify your primary email on GitHub and try again.",
};

/** Why a sign-in whose email belongs to another account stops: every account has a password or an identity. */
function blockedReason(existing: { hashedPassword: string | null; identities: { provider: AuthProvider }[] }, provider: AuthProvider): string {
  if (existing.identities.some((identity) => identity.provider === provider)) return `This email is linked to a different ${PROVIDER_LABEL[provider].account}.`;
  if (existing.hashedPassword) return "This email is already registered with a password. Sign in with email and password.";
  const other = existing.identities[0]?.provider ?? provider;
  return `This email is linked to ${other === "APPLE" ? "an" : "a"} ${PROVIDER_LABEL[other].account}. Sign in with ${PROVIDER_LABEL[other].signIn}.`;
}

/**
 * Returning users match by the provider subject alone (Apple only shares the email on the first
 * authorization; private-relay addresses are ordinary emails). The guest snapshot is applied only
 * when a NEW user is created; existing server data always wins. Identities live in AuthIdentity,
 * several providers per account (PRD 14.3).
 */
export async function findOrCreateSocialUser(
  provider: AuthProviderName,
  subject: string,
  email: string | undefined,
  displayName?: string,
  guestSnapshot?: GuestSnapshot,
): Promise<{ user: User; isNew: boolean }> {
  const identity = await prisma.authIdentity.findUnique({ where: { provider_subject: { provider: PROVIDER[provider], subject } }, include: { user: true } });
  if (identity) return { user: identity.user, isNew: false };
  if (!email) throw new SocialSignInBlockedError(NO_EMAIL_MESSAGE[provider]);
  const byEmail = await prisma.user.findUnique({ where: { email }, select: { hashedPassword: true, identities: { select: { provider: true }, orderBy: { createdAt: "asc" } } } });
  if (byEmail) throw new SocialSignInBlockedError(blockedReason(byEmail, PROVIDER[provider]));
  const user = await createSocialUserWithProgress({ provider: PROVIDER[provider], subject }, email, displayName, guestSnapshot);
  return { user, isNew: true };
}
