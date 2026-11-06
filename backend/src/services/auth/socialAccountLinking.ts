import { prisma, type User } from "@project/db";
import { createSocialUserWithProgress } from "./createSocialUser.js";
import type { GuestSnapshot } from "./guestSnapshotMigration.js";

export type SocialSignInProvider = "google" | "apple";

export class SocialSignInBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SocialSignInBlockedError";
  }
}

const APPLE_NO_EMAIL_MESSAGE =
  "Apple did not share an email for this account. In Settings > Apple ID > Sign-In & Security, remove this app and try again.";

/** Every User row carries a password, a Google id or an Apple sub, so an email match is always one of these. */
function blockedReason(existing: User, provider: SocialSignInProvider): string {
  const linkedToOtherAccountOfSameProvider = provider === "google" ? existing.googleId : existing.appleSub;
  if (linkedToOtherAccountOfSameProvider) {
    return `This email is linked to a different ${provider === "google" ? "Google account" : "Apple ID"}.`;
  }
  if (existing.hashedPassword) return "This email is already registered with a password. Sign in with email and password.";
  return provider === "google"
    ? "This email is linked to an Apple ID. Sign in with Apple."
    : "This email is linked to a Google account. Sign in with Google.";
}

/**
 * Returning users match by the provider subject alone (Apple only shares the email on the first
 * authorization; private-relay addresses are ordinary emails). The guest snapshot is applied only
 * when a NEW user is created; existing server data always wins.
 */
export async function findOrCreateSocialUser(
  provider: SocialSignInProvider,
  subject: string,
  email: string | undefined,
  displayName?: string,
  guestSnapshot?: GuestSnapshot,
): Promise<{ user: User; isNew: boolean }> {
  const providerKey = provider === "google" ? { googleId: subject } : { appleSub: subject };
  const bySubject = await prisma.user.findUnique({ where: providerKey });
  if (bySubject) return { user: bySubject, isNew: false };
  if (!email) throw new SocialSignInBlockedError(APPLE_NO_EMAIL_MESSAGE);
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) throw new SocialSignInBlockedError(blockedReason(byEmail, provider));
  const user = await createSocialUserWithProgress(providerKey, email, displayName, guestSnapshot);
  return { user, isNew: true };
}
