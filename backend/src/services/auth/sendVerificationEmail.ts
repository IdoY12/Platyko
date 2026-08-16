import { VERIFICATION_CODE_TTL_MINUTES } from "./emailVerificationCodes.js";
import { sendBrandedEmail } from "./sendBrandedEmail.js";
import { buildVerificationEmailHtml } from "./verificationEmailHtml.js";

function buildVerificationEmailText(code: string): string {
  return [
    "Let's make it official!",
    "",
    `Your Platyko verification code: ${code}`,
    "",
    `Enter it in the app within ${VERIFICATION_CODE_TTL_MINUTES} minutes to verify your email.`,
    "",
    "Didn't sign up for Platyko? No worries — you can safely ignore this email.",
    "",
    "Happy coding — see you in the app!",
    "Platyko · Learn JavaScript by playing",
  ].join("\n");
}

/** Sends the 6-digit verification code; see sendBrandedEmail for the no-throw contract. */
export function sendVerificationCodeEmail(toEmail: string, code: string): Promise<boolean> {
  return sendBrandedEmail({
    toEmail,
    subject: "Your Platyko verification code",
    text: buildVerificationEmailText(code),
    html: buildVerificationEmailHtml(code),
    logTag: "verification-code",
  });
}
