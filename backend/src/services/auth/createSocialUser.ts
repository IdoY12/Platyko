import { randomBytes } from "node:crypto";
import { parsePuzzleXpSolveCounts, prisma, type AuthProvider, type User } from "@project/db";
import { containsBannedWord, USERNAME_MAX_LEN, USERNAME_MIN_LEN } from "@project/user-credentials";
import { isUsernameTakenError } from "../../utils/dbErrors.js";
import { createProgressRowsFromSnapshot, type GuestSnapshot } from "./guestSnapshotMigration.js";
import { DEFAULT_LANGUAGE } from "@project/locales";

const USERNAME_SUFFIX_RETRIES = 12;
const USERNAME_RANDOM_RETRIES = 8;

/** The sign-in identity the new account is created with. */
type SocialIdentity = { provider: AuthProvider; subject: string };

function deriveUsername(email: string, displayName?: string): string {
  const named = displayName?.trim().replace(/\s+/g, "_").slice(0, USERNAME_MAX_LEN);
  const local = (email.split("@")[0] || "user").slice(0, USERNAME_MAX_LEN);
  let u = named && named.length >= USERNAME_MIN_LEN ? named : local;
  if (u.length < USERNAME_MIN_LEN) u = `${local}_gq`.slice(0, USERNAME_MAX_LEN).padEnd(USERNAME_MIN_LEN, "_");
  // A name or address with a banned word never becomes a public username (PRD 11.2).
  return containsBannedWord(u) ? randomUsername() : u.slice(0, USERNAME_MAX_LEN);
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
  identity: SocialIdentity, email: string, displayName?: string, snapshot: GuestSnapshot = {},
): Promise<User> {
  let candidate = deriveUsername(email, displayName);
  const max = USERNAME_SUFFIX_RETRIES + USERNAME_RANDOM_RETRIES;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            username: candidate,
            hashedPassword: null,
            activeExperienceLevel: snapshot.experienceLevel ?? "JUNIOR",
            notificationsEnabled: snapshot.notificationsEnabled ?? true,
            language: snapshot.language ?? DEFAULT_LANGUAGE,
            puzzleXpSolveCounts: parsePuzzleXpSolveCounts(snapshot.puzzleXpSolveCounts ?? null),
          },
        });
        await tx.authIdentity.create({ data: { ...identity, userId: created.id } });
        await createProgressRowsFromSnapshot(tx, created.id, snapshot);
        return created;
      });
    } catch (error) {
      if (!isUsernameTakenError(error)) throw error;
      candidate =
        attempt + 1 < USERNAME_SUFFIX_RETRIES
          ? usernameWithCollisionSuffix(deriveUsername(email, displayName))
          : randomUsername();
    }
  }
  throw new Error("Social signup: username collision after retries");
}
