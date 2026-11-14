import { randomBytes } from "node:crypto";
import { hashPassword } from "../../utils/passwordHashing.js";
import { OTP_RESEND_COOLDOWN_SECONDS } from "./otpCodes.js";
import { sendAccountExistsEmail } from "./sendAccountExistsEmail.js";

/** When each registered address last got the notice, for the same cooldown a real sign-up has. */
const noticeSentAt = new Map<string, number>();

/**
 * Sign-up for an address that already has an account (PRD 15.7: no user enumeration). The reply
 * looks like a new sign-up's: the same work (a password hash and one email), the same cooldown,
 * and a token that matches no pending registration, so its code can never verify. The owner
 * gets a notice instead of a code. Returns the seconds left in the cooldown, or the token.
 */
export async function answerRegistrationForExistingEmail(email: string, password: string): Promise<{ cooldownSeconds: number } | { registrationToken: string; emailSent: boolean }> {
  const lastSent = noticeSentAt.get(email) ?? 0;
  const secondsLeft = Math.ceil((lastSent + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
  if (secondsLeft > 0) return { cooldownSeconds: secondsLeft };
  noticeSentAt.set(email, Date.now());
  await hashPassword(password);
  const emailSent = await sendAccountExistsEmail(email);
  return { registrationToken: randomBytes(24).toString("base64url"), emailSent };
}
