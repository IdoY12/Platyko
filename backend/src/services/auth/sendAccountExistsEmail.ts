import { buildCodeEmailHtml } from "./codeEmailHtml.js";
import { sendBrandedEmail } from "./sendBrandedEmail.js";

const TEXT = [
  "You already have a Platyko account",
  "",
  "Someone, hopefully you, tried to create a new Platyko account with this email address.",
  "You already have one: sign in, or choose \"Forgot password?\" on the sign-in screen.",
  "",
  "Didn't try to sign up? You can safely ignore this email; nothing has changed.",
  "",
  "Platyko · Learn JavaScript by playing",
].join("\n");

/**
 * Sent instead of a verification code when someone registers with an address that already has
 * an account. The sign-up screen answers the same either way, so it never tells anyone whether
 * an address is registered (PRD 15.7); only the address's owner learns it, from this email.
 */
export function sendAccountExistsEmail(toEmail: string): Promise<boolean> {
  return sendBrandedEmail({
    toEmail,
    subject: "You already have a Platyko account",
    text: TEXT,
    html: buildCodeEmailHtml({
      code: null,
      previewText: "Sign in, or reset your password from the sign-in screen.",
      title: "You already have an account",
      subtitle: "Someone, hopefully you, tried to sign up again with this email. Sign in, or choose &ldquo;Forgot password?&rdquo; on the sign-in screen.",
      footerNote: "Didn&rsquo;t try to sign up? You can safely ignore this email &mdash; nothing has changed.",
    }),
    logTag: "account-exists",
  });
}
