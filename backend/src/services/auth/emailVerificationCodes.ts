import { randomInt } from "node:crypto";
import { prisma } from "@project/db";
import { comparePassword, hashPassword } from "../../utils/passwordHashing.js";

export const VERIFICATION_CODE_TTL_MINUTES = 10;
const VERIFICATION_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/** Creates (or replaces) the user's pending 6-digit code and returns the plaintext to email. */
export async function createVerificationCode(userId: string): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);
  await prisma.emailVerification.upsert({
    where: { userId },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
    create: { userId, codeHash, expiresAt },
  });
  return code;
}

/** Seconds the user must still wait before another verification email may be sent. */
export async function resendCooldownSecondsLeft(userId: string): Promise<number> {
  const record = await prisma.emailVerification.findUnique({ where: { userId } });
  if (!record) return 0;
  const msLeft = record.lastSentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - Date.now();
  return msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
}

export type VerificationOutcome = "ok" | "invalid" | "expired" | "locked" | "missing";

/** Checks the submitted code; on success marks the user verified and deletes the record. */
export async function consumeVerificationCode(userId: string, code: string): Promise<VerificationOutcome> {
  const record = await prisma.emailVerification.findUnique({ where: { userId } });
  if (!record) return "missing";
  if (record.attempts >= VERIFICATION_MAX_ATTEMPTS) return "locked";
  if (record.expiresAt.getTime() < Date.now()) return "expired";
  if (!(await comparePassword(code, record.codeHash))) {
    const updated = await prisma.emailVerification.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    });
    return updated.attempts >= VERIFICATION_MAX_ATTEMPTS ? "locked" : "invalid";
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
    prisma.emailVerification.delete({ where: { userId } }),
  ]);
  return "ok";
}
