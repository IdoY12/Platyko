import { randomBytes } from "node:crypto";
import { parsePuzzleXpSolveCounts, prisma, type PendingRegistration, type User } from "@project/db";
import { EMAIL_TAKEN_MESSAGE, USERNAME_TAKEN_MESSAGE } from "@project/user-credentials";
import { isUniqueConstraintError } from "../../utils/dbErrors.js";
import { hashPassword } from "../../utils/passwordHashing.js";
import { createProgressRowsFromSnapshot, type GuestSnapshot } from "./guestSnapshotMigration.js";
import { checkOtpCode, freshOtpFields, otpResendCooldownSecondsLeft, type OtpOutcome } from "./otpCodes.js";

/** A pending row nobody re-sent a code for within this window is purged (opportunistically, on register). */
const PENDING_REGISTRATION_TTL_HOURS = 24;

type PendingInput = { email: string; username: string; password: string; snapshot: GuestSnapshot };

export function purgeStalePendingRegistrations(): Promise<unknown> {
  const cutoff = new Date(Date.now() - PENDING_REGISTRATION_TTL_HOURS * 60 * 60 * 1000);
  return prisma.pendingRegistration.deleteMany({ where: { lastSentAt: { lt: cutoff } } });
}

/** Creates or replaces the address's pending registration; returns the plaintext code and the device token. */
export async function createPendingRegistration(input: PendingInput): Promise<{ code: string; registrationToken: string }> {
  const { code, fields } = await freshOtpFields();
  const registrationToken = randomBytes(24).toString("base64url");
  const data = {
    username: input.username,
    passwordHash: await hashPassword(input.password),
    registrationToken,
    guestSnapshot: input.snapshot,
    ...fields,
  };
  await prisma.pendingRegistration.upsert({ where: { email: input.email }, update: data, create: { email: input.email, ...data } });
  return { code, registrationToken };
}

/** "replaced" = a row exists but was re-created by a later register (its token differs from the caller's). */
export async function findPendingRegistration(email: string, registrationToken: string): Promise<PendingRegistration | "missing" | "replaced"> {
  const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
  if (!pending) return "missing";
  return pending.registrationToken === registrationToken ? pending : "replaced";
}

export function pendingResendCooldownSecondsLeft(email: string): Promise<number> {
  return otpResendCooldownSecondsLeft(prisma.pendingRegistration, { email });
}

/** Issues a fresh code on the existing row (resend) and returns the plaintext to email. */
export async function refreshPendingRegistrationCode(email: string): Promise<string> {
  const { code, fields } = await freshOtpFields();
  await prisma.pendingRegistration.update({ where: { email }, data: fields });
  return code;
}

/** Checks the code; on "ok" creates the User + progress rows and deletes the pending row in one transaction. */
export async function consumePendingRegistration(pending: PendingRegistration, code: string): Promise<{ outcome: OtpOutcome; user: User | null }> {
  const outcome = await checkOtpCode(prisma.pendingRegistration, { email: pending.email }, code);
  if (outcome !== "ok") return { outcome, user: null };
  const snapshot = pending.guestSnapshot as GuestSnapshot;
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: pending.email,
        username: pending.username,
        hashedPassword: pending.passwordHash,
        activeExperienceLevel: snapshot.experienceLevel ?? "JUNIOR",
        notificationsEnabled: snapshot.notificationsEnabled ?? true,
        puzzleXpSolveCounts: parsePuzzleXpSolveCounts(snapshot.puzzleXpSolveCounts ?? null),
      },
    });
    await createProgressRowsFromSnapshot(tx, created.id, snapshot);
    await tx.pendingRegistration.delete({ where: { email: pending.email } });
    return created;
  });
  return { outcome, user };
}

/** Maps a User unique-constraint failure (email/username taken meanwhile) to the client message, else null. */
export function registrationConflictMessage(error: unknown): string | null {
  if (isUniqueConstraintError(error, "username")) return USERNAME_TAKEN_MESSAGE;
  if (isUniqueConstraintError(error, "email")) return EMAIL_TAKEN_MESSAGE;
  return null;
}
