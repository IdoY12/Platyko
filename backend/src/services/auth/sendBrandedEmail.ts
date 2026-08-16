import { readFileSync } from "node:fs";
import { SendRawEmailCommand } from "@aws-sdk/client-ses";
import { sesClient, sesFromEmail } from "../../aws/sesClient.js";
import { logError, logInfo } from "../../utils/logger.js";
import { buildRawEmail, type InlineImage } from "../../utils/mimeMessage.js";

/** Assets live in src/assets; the build script copies them next to the compiled output. */
function loadEmailAsset(filename: string): Buffer {
  return readFileSync(new URL(`../../assets/${filename}`, import.meta.url));
}

const inlineImages: InlineImage[] = [
  { contentId: "platyko-banner", filename: "email-banner.jpg", data: loadEmailAsset("email-banner.jpg") },
  { contentId: "platyko-icon", filename: "email-icon.jpg", data: loadEmailAsset("email-icon.jpg") },
  { contentId: "platyko-mascot", filename: "email-mascot.jpg", data: loadEmailAsset("email-mascot.jpg") },
];

export type BrandedEmail = { toEmail: string; subject: string; text: string; html: string; logTag: string };

/**
 * Sends a branded Platyko email via AWS SES. Failures are logged, never thrown:
 * the calling flow must still succeed when the mailbox is unreachable (e.g. SES
 * sandbox); the user recovers through the resend path.
 */
export async function sendBrandedEmail({ toEmail, subject, text, html, logTag }: BrandedEmail): Promise<boolean> {
  const command = new SendRawEmailCommand({
    Source: sesFromEmail,
    Destinations: [toEmail],
    RawMessage: { Data: buildRawEmail({ from: sesFromEmail, to: toEmail, subject, text, html, inlineImages }) },
  });
  try {
    await sesClient.send(command);
    logInfo("[MAIL]", `${logTag}:sent`, { toEmail });
    return true;
  } catch (error) {
    logError("[MAIL]", error, { phase: `${logTag}:send`, toEmail });
    return false;
  }
}
