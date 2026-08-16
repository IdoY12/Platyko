import { VERIFICATION_CODE_TTL_MINUTES } from "./emailVerificationCodes.js";
import { buildCodeEmailHtml } from "./codeEmailHtml.js";

/** Branded HTML for the email-verification OTP; layout comes from codeEmailHtml. */
export function buildVerificationEmailHtml(code: string): string {
  return buildCodeEmailHtml({
    code,
    previewText: `Your Platyko code is ${code} &mdash; it expires in ${VERIFICATION_CODE_TTL_MINUTES} minutes.`,
    title: "Let&rsquo;s make it official",
    subtitle: "Enter this code in the app to verify your email &mdash; your streak will thank you.",
    footerNote: "Didn&rsquo;t sign up for Platyko? No worries &mdash; you can safely ignore this email.",
  });
}
