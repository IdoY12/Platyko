import { prisma, type User } from "@project/db";
import { createGoogleUserWithProgress } from "./createGoogleUser.js";
import type { GuestSnapshot } from "./guestSnapshotMigration.js";

export class GoogleSignInBlockedError extends Error {
  constructor(m: string) {
    super(m);
    this.name = "GoogleSignInBlockedError";
  }
}

/** The guest snapshot is applied only when a NEW user is created; existing server data always wins. */
export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  displayName?: string,
  guestSnapshot?: GuestSnapshot,
): Promise<{ user: User; isNew: boolean }> {
  const bySub = await prisma.user.findUnique({ where: { googleId } });
  if (bySub) return { user: bySub, isNew: false };
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== googleId) {
      throw new GoogleSignInBlockedError("This email is linked to a different Google account.");
    }
    if (byEmail.hashedPassword) {
      throw new GoogleSignInBlockedError(
        "This email is already registered with a password. Sign in with email and password.",
      );
    }
    const updated = await prisma.user.update({ where: { id: byEmail.id }, data: { googleId } });
    return { user: updated, isNew: false };
  }
  const user = await createGoogleUserWithProgress(googleId, email, displayName, guestSnapshot);
  return { user, isNew: true };
}
