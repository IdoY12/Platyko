import { prisma } from "@project/db";
import {
  OTP_CODE_TTL_MINUTES,
  checkOtpCode,
  createOtpCode,
  otpResendCooldownSecondsLeft,
  type OtpOutcome,
} from "./otpCodes.js";

export const VERIFICATION_CODE_TTL_MINUTES = OTP_CODE_TTL_MINUTES;
export type VerificationOutcome = OtpOutcome;

/** Creates (or replaces) the user's pending 6-digit code and returns the plaintext to email. */
export function createVerificationCode(userId: string): Promise<string> {
  return createOtpCode(prisma.emailVerification, userId);
}

/** Seconds the user must still wait before another verification email may be sent. */
export function resendCooldownSecondsLeft(userId: string): Promise<number> {
  return otpResendCooldownSecondsLeft(prisma.emailVerification, userId);
}

/** Checks the submitted code; on success marks the user verified and deletes the record. */
export async function consumeVerificationCode(userId: string, code: string): Promise<VerificationOutcome> {
  const outcome = await checkOtpCode(prisma.emailVerification, userId, code);
  if (outcome !== "ok") return outcome;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
    prisma.emailVerification.delete({ where: { userId } }),
  ]);
  return "ok";
}
