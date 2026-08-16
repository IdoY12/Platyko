import { OTP_CODE_TTL_MINUTES } from "./otpCodes.js";
import { sendBrandedEmail } from "./sendBrandedEmail.js";
import { buildPasswordResetEmailHtml } from "./passwordResetEmailHtml.js";

function buildPasswordResetEmailText(code: string): string {
  return [
    "Reset your password",
    "",
    `Your Platyko password reset code: ${code}`,
    "",
    `Enter it in the app within ${OTP_CODE_TTL_MINUTES} minutes to choose a new password.`,
    "",
    "Didn't request a password reset? You can safely ignore this email — your password stays unchanged.",
    "",
    "Happy coding — see you in the app!",
    "Platyko · Learn JavaScript by playing",
  ].join("\n");
}

/** Sends the 6-digit password-reset code; see sendBrandedEmail for the no-throw contract. */
export function sendPasswordResetCodeEmail(toEmail: string, code: string): Promise<boolean> {
  return sendBrandedEmail({
    toEmail,
    subject: "Your Platyko password reset code",
    text: buildPasswordResetEmailText(code),
    html: buildPasswordResetEmailHtml(code),
    logTag: "password-reset-code",
  });
}
