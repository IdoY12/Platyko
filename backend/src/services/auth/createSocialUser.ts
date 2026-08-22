import { randomBytes } from "node:crypto";
import { parsePuzzleXpSolveCounts, prisma, type User } from "@project/db";
import { USERNAME_MAX_LEN, USERNAME_MIN_LEN } from "@project/user-credentials";
import { isUniqueConstraintError } from "../../utils/dbErrors.js";
import { createProgressRowsFromSnapshot, type GuestSnapshot } from "./guestSnapshotMigration.js";

const USERNAME_SUFFIX_RETRIES = 12;
const USERNAME_RANDOM_RETRIES = 8;

/** Provider identity column(s) to store on the new user row. */
export type SocialProvider = { googleId: string } | { appleSub: string };

function deriveUsername(email: string, displayName?: string): string {
  const named = displayName?.trim().replace(/\s+/g, "_").slice(0, USERNAME_MAX_LEN);
  const local = (email.split("@")[0] || "user").slice(0, USERNAME_MAX_LEN);
  let u = named && named.length >= USERNAME_MIN_LEN ? named : local;
  if (u.length < USERNAME_MIN_LEN) u = `${local}_gq`.slice(0, USERNAME_MAX_LEN).padEnd(USERNAME_MIN_LEN, "_");
  return u.slice(0, USERNAME_MAX_LEN);
}

function usernameWithCollisionSuffix(base: string): string {
  const suffix = randomBytes(3).toString("hex");
  const cap = USERNAME_MAX_LEN - 1 - suffix.length;
  return `${base.slice(0, cap)}_${suffix}`;
}

function randomUsername(): string {
  return `g${randomBytes(12).toString("hex")}`.slice(0, USERNAME_MAX_LEN).padEnd(USERNAME_MIN_LEN, "x");
}

export async function createSocialUserWithProgress(
  provider: SocialProvider, email: string, displayName?: string, snapshot: GuestSnapshot = {},
): Promise<User> {
  let candidate = deriveUsername(email, displayName);
  const max = USERNAME_SUFFIX_RETRIES + USERNAME_RANDOM_RETRIES;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            ...provider,
            username: candidate,
            hashedPassword: null,
            // The provider already proved ownership of this email — no OTP round trip needed
            emailVerified: true,
            activeExperienceLevel: snapshot.experienceLevel ?? "JUNIOR",
            notificationsEnabled: snapshot.notificationsEnabled ?? true,
            puzzleXpSolveCounts: parsePuzzleXpSolveCounts(snapshot.puzzleXpSolveCounts ?? null),
          },
        });
        await createProgressRowsFromSnapshot(tx, created.id, snapshot);
        return created;
      });
    } catch (error) {
      if (!isUniqueConstraintError(error, "username")) throw error;
      candidate =
        attempt + 1 < USERNAME_SUFFIX_RETRIES
          ? usernameWithCollisionSuffix(deriveUsername(email, displayName))
          : randomUsername();
    }
  }
  throw new Error("Social signup: username collision after retries");
}
