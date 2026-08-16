import { prisma, type User } from "@project/db";
import { createSocialUserWithProgress } from "./createSocialUser.js";
import type { GuestSnapshot } from "./guestSnapshotMigration.js";

export class AppleSignInBlockedError extends Error {
  constructor(m: string) {
    super(m);
    this.name = "AppleSignInBlockedError";
  }
}

/**
 * The guest snapshot is applied only when a NEW user is created; existing server data always wins.
 * Apple sends the email only on the first authorization, so returning users match by appleSub alone.
 * Private-relay addresses (@privaterelay.appleid.com) are treated as normal emails.
 */
export async function findOrCreateAppleUser(
  appleSub: string,
  email?: string,
  displayName?: string,
  guestSnapshot?: GuestSnapshot,
): Promise<{ user: User; isNew: boolean }> {
  const bySub = await prisma.user.findUnique({ where: { appleSub } });
  if (bySub) return { user: bySub, isNew: false };
  if (!email) {
    throw new AppleSignInBlockedError(
      "Apple did not share an email for this account. In Settings > Apple ID > Sign-In & Security, remove this app and try again.",
    );
  }
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.appleSub && byEmail.appleSub !== appleSub) {
      throw new AppleSignInBlockedError("This email is linked to a different Apple ID.");
    }
    if (byEmail.hashedPassword) {
      throw new AppleSignInBlockedError(
        "This email is already registered with a password. Sign in with email and password.",
      );
    }
    if (byEmail.googleId) {
      throw new AppleSignInBlockedError("This email is linked to a Google account. Sign in with Google.");
    }
    const updated = await prisma.user.update({ where: { id: byEmail.id }, data: { appleSub } });
    return { user: updated, isNew: false };
  }
  const user = await createSocialUserWithProgress({ appleSub }, email, displayName, guestSnapshot);
  return { user, isNew: true };
}
