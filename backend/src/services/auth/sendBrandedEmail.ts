import { readFileSync } from "node:fs";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { RESEND_FROM_EMAIL, getResendClient } from "./resendClient.js";

/** Assets live in src/assets; the build script copies them next to the compiled output. */
function loadEmailAsset(filename: string): Buffer {
  return readFileSync(new URL(`../../assets/${filename}`, import.meta.url));
}

/** Inline images the HTML templates reference as `cid:<contentId>`. */
const inlineImages = [
  { contentId: "platyko-banner", filename: "email-banner.jpg", content: loadEmailAsset("email-banner.jpg") },
  { contentId: "platyko-icon", filename: "email-icon.jpg", content: loadEmailAsset("email-icon.jpg") },
  { contentId: "platyko-mascot", filename: "email-mascot.jpg", content: loadEmailAsset("email-mascot.jpg") },
];

export type BrandedEmail = { toEmail: string; subject: string; text: string; html: string; logTag: string };

/**
 * Sends a branded Platyko email via Resend. Failures are logged, never thrown:
 * the calling flow must still succeed when the mailbox is unreachable; the user
 * recovers through the resend path. Addresses flagged `emailBounced` (set by
 * the Resend webhook) are skipped so a bouncing or complaining inbox is never
 * mailed again.
 */
export async function sendBrandedEmail({ toEmail, subject, text, html, logTag }: BrandedEmail): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { email: toEmail }, select: { emailBounced: true } });
    if (user?.emailBounced) {
      logWarn("[MAIL]", `${logTag}:skipped-bounced`, { toEmail });
      return false;
    }
    const { error } = await getResendClient().emails.send({
      from: RESEND_FROM_EMAIL,
      to: toEmail,
      subject,
      text,
      html,
      attachments: inlineImages,
    });
    if (error) throw new Error(`Resend ${error.name}: ${error.message}`);
    logInfo("[MAIL]", `${logTag}:sent`, { toEmail });
    return true;
  } catch (error) {
    logError("[MAIL]", error, { phase: `${logTag}:send`, toEmail });
    return false;
  }
}
