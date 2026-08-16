import { randomInt } from "node:crypto";
import { comparePassword, hashPassword } from "../../utils/passwordHashing.js";

export const OTP_CODE_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

type OtpRecord = { codeHash: string; expiresAt: Date; attempts: number; lastSentAt: Date };
type OtpWriteFields = { codeHash: string; expiresAt: Date; attempts?: number; lastSentAt?: Date };

/** Structural subset of the Prisma delegates that back OTP rows (emailVerification, passwordReset). */
export type OtpDelegate = {
  findUnique(args: { where: { userId: string } }): PromiseLike<OtpRecord | null>;
  upsert(args: {
    where: { userId: string };
    update: OtpWriteFields;
    create: OtpWriteFields & { userId: string };
  }): PromiseLike<unknown>;
  update(args: { where: { userId: string }; data: { attempts: { increment: number } } }): PromiseLike<OtpRecord>;
};

export type OtpOutcome = "ok" | "invalid" | "expired" | "locked" | "missing";

export const OTP_OUTCOME_ERRORS: Record<Exclude<OtpOutcome, "ok">, string> = {
  invalid: "Incorrect code. Please try again.",
  expired: "This code has expired. Request a new one.",
  locked: "Too many wrong attempts. Request a new code.",
  missing: "No active code for this account. Request a new one.",
};

/** Creates (or replaces) the user's pending 6-digit code and returns the plaintext to email. */
export async function createOtpCode(codes: OtpDelegate, userId: string): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_CODE_TTL_MINUTES * 60 * 1000);
  await codes.upsert({
    where: { userId },
    update: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
    create: { userId, codeHash, expiresAt },
  });
  return code;
}

/** Seconds the user must still wait before another code email may be sent. */
export async function otpResendCooldownSecondsLeft(codes: OtpDelegate, userId: string): Promise<number> {
  const record = await codes.findUnique({ where: { userId } });
  if (!record) return 0;
  const msLeft = record.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now();
  return msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
}

/** Checks the submitted code and counts failed attempts; the caller consumes the row on "ok". */
export async function checkOtpCode(codes: OtpDelegate, userId: string, code: string): Promise<OtpOutcome> {
  const record = await codes.findUnique({ where: { userId } });
  if (!record) return "missing";
  if (record.attempts >= OTP_MAX_ATTEMPTS) return "locked";
  if (record.expiresAt.getTime() < Date.now()) return "expired";
  if (!(await comparePassword(code, record.codeHash))) {
    const updated = await codes.update({ where: { userId }, data: { attempts: { increment: 1 } } });
    return updated.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "invalid";
  }
  return "ok";
}
