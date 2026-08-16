import { readFileSync } from "node:fs";
import { SendRawEmailCommand } from "@aws-sdk/client-ses";
import { sesClient, sesFromEmail } from "../../aws/sesClient.js";
import { logError, logInfo } from "../../utils/logger.js";
import { buildRawEmail, type InlineImage } from "../../utils/mimeMessage.js";
import { VERIFICATION_CODE_TTL_MINUTES } from "./emailVerificationCodes.js";
import { buildVerificationEmailHtml } from "./verificationEmailHtml.js";

/** Assets live in src/assets; the build script copies them next to the compiled output. */
function loadEmailAsset(filename: string): Buffer {
  return readFileSync(new URL(`../../assets/${filename}`, import.meta.url));
}

const inlineImages: InlineImage[] = [
  { contentId: "platyko-banner", filename: "email-banner.png", data: loadEmailAsset("email-banner.png") },
  { contentId: "platyko-icon", filename: "email-icon.png", data: loadEmailAsset("email-icon.png") },
  { contentId: "platyko-mascot", filename: "email-mascot.png", data: loadEmailAsset("email-mascot.png") },
];

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

/**
 * Sends the 6-digit verification code via AWS SES. Failures are logged, never
 * thrown: registration must still succeed when the mailbox is unreachable
 * (e.g. SES sandbox); the user recovers through the resend endpoint.
 */
export async function sendVerificationCodeEmail(toEmail: string, code: string): Promise<boolean> {
  const command = new SendRawEmailCommand({
    Source: sesFromEmail,
    Destinations: [toEmail],
    RawMessage: {
      Data: buildRawEmail({
        from: sesFromEmail,
        to: toEmail,
        subject: "Your Platyko verification code",
        text: buildVerificationEmailText(code),
        html: buildVerificationEmailHtml(code),
        inlineImages,
      }),
    },
  });
  try {
    await sesClient.send(command);
    logInfo("[MAIL]", "verification-code:sent", { toEmail });
    return true;
  } catch (error) {
    logError("[MAIL]", error, { phase: "verification-code:send", toEmail });
    return false;
  }
}
