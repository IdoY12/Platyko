import { OTP_CODE_TTL_MINUTES } from "./otpCodes.js";
import { buildCodeEmailHtml } from "./codeEmailHtml.js";

/** Branded HTML for the password-reset OTP; layout comes from codeEmailHtml. */
export function buildPasswordResetEmailHtml(code: string): string {
  return buildCodeEmailHtml({
    code,
    previewText: `Your Platyko password reset code is ${code} &mdash; it expires in ${OTP_CODE_TTL_MINUTES} minutes.`,
    title: "Reset your password",
    subtitle: "Enter this code in the app to choose a new password for your account.",
    footerNote: "Didn&rsquo;t request a password reset? You can safely ignore this email &mdash; your password stays unchanged.",
  });
}
