import { randomInt } from "node:crypto";
import { comparePassword, hashPassword } from "../../utils/passwordHashing.js";

export const OTP_CODE_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

type OtpRecord = { codeHash: string; expiresAt: Date; attempts: number; lastSentAt: Date };
export type OtpFields = { codeHash: string; expiresAt: Date; attempts: number; lastSentAt: Date };

/**
 * Structural subset of the Prisma delegates that back OTP rows, generic over the
 * unique key: passwordReset ({ userId }) and pendingRegistration ({ email }).
 * Callers pass the key literally; NoInfer stops the delegate's wide Prisma
 * WhereUniqueInput from being picked as the key type.
 */
export type OtpDelegate<Where> = {
  findUnique(args: { where: Where }): PromiseLike<OtpRecord | null>;
  update(args: { where: Where; data: { attempts: { increment: number } } }): PromiseLike<OtpRecord>;
};
/** Rows whose only columns are the key + OTP fields (passwordReset) can be created by createOtpCode. */
type OtpUpsertDelegate<Where> = OtpDelegate<Where> & {
  upsert(args: { where: Where; update: OtpFields; create: OtpFields & Where }): PromiseLike<unknown>;
};

export type OtpOutcome = "ok" | "invalid" | "expired" | "locked" | "missing";

export const OTP_OUTCOME_ERRORS: Record<Exclude<OtpOutcome, "ok">, string> = {
  invalid: "Incorrect code. Please try again.",
  expired: "This code has expired. Request a new one.",
  locked: "Too many wrong attempts. Request a new code.",
  missing: "No active code for this account. Request a new one.",
};

/** A fresh 6-digit code (plaintext, to email) plus the columns that store it. */
export async function freshOtpFields(): Promise<{ code: string; fields: OtpFields }> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_CODE_TTL_MINUTES * 60 * 1000);
  return { code, fields: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() } };
}

/** Creates (or replaces) the row's pending 6-digit code and returns the plaintext to email. */
export async function createOtpCode<Where>(codes: OtpUpsertDelegate<NoInfer<Where>>, where: Where): Promise<string> {
  const { code, fields } = await freshOtpFields();
  await codes.upsert({ where, update: fields, create: { ...fields, ...where } });
  return code;
}

/** Seconds the caller must still wait before another code email may be sent. */
export async function otpResendCooldownSecondsLeft<Where>(codes: OtpDelegate<NoInfer<Where>>, where: Where): Promise<number> {
  const record = await codes.findUnique({ where });
  if (!record) return 0;
  const msLeft = record.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now();
  return msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
}

/** Checks the submitted code and counts failed attempts; the caller consumes the row on "ok". */
export async function checkOtpCode<Where>(codes: OtpDelegate<NoInfer<Where>>, where: Where, code: string): Promise<OtpOutcome> {
  const record = await codes.findUnique({ where });
  if (!record) return "missing";
  if (record.attempts >= OTP_MAX_ATTEMPTS) return "locked";
  if (record.expiresAt.getTime() < Date.now()) return "expired";
  if (!(await comparePassword(code, record.codeHash))) {
    const updated = await codes.update({ where, data: { attempts: { increment: 1 } } });
    return updated.attempts >= OTP_MAX_ATTEMPTS ? "locked" : "invalid";
  }
  return "ok";
}
