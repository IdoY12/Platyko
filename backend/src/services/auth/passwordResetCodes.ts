import { prisma } from "@project/db";
import { hashPassword } from "../../utils/passwordHashing.js";
import { checkOtpCode, createOtpCode, otpResendCooldownSecondsLeft, type OtpOutcome } from "./otpCodes.js";

/** Creates (or replaces) the user's pending 6-digit reset code and returns the plaintext to email. */
export function createPasswordResetCode(userId: string): Promise<string> {
  return createOtpCode(prisma.passwordReset, userId);
}

/** Seconds the user must still wait before another reset email may be sent. */
export function passwordResetCooldownSecondsLeft(userId: string): Promise<number> {
  return otpResendCooldownSecondsLeft(prisma.passwordReset, userId);
}

/**
 * Checks the submitted code; on success sets the new password, revokes every
 * outstanding session (tokenVersion bump + refresh-token wipe), and deletes the
 * used code — one transaction so a consumed code can never be replayed.
 */
export async function consumePasswordResetCode(userId: string, code: string, newPassword: string): Promise<OtpOutcome> {
  const outcome = await checkOtpCode(prisma.passwordReset, userId, code);
  if (outcome !== "ok") return outcome;
  const hashedPassword = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { hashedPassword, tokenVersion: { increment: 1 } } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.passwordReset.delete({ where: { userId } }),
  ]);
  return "ok";
}
