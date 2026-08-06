import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient, sesFromEmail } from "../../aws/sesClient.js";
import { logError, logInfo } from "../../utils/logger.js";
import { VERIFICATION_CODE_TTL_MINUTES } from "./emailVerificationCodes.js";

/**
 * Sends the 6-digit verification code via AWS SES. Failures are logged, never
 * thrown: registration must still succeed when the mailbox is unreachable
 * (e.g. SES sandbox); the user recovers through the resend endpoint.
 */
export async function sendVerificationCodeEmail(toEmail: string, code: string): Promise<boolean> {
  const expiry = `It expires in ${VERIFICATION_CODE_TTL_MINUTES} minutes.`;
  const command = new SendEmailCommand({
    Source: sesFromEmail,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Charset: "UTF-8", Data: "Your Platybit verification code" },
      Body: {
        Text: { Charset: "UTF-8", Data: `Your Platybit verification code is ${code}. ${expiry}` },
        Html: {
          Charset: "UTF-8",
          Data: `<p>Your Platybit verification code is:</p><h1>${code}</h1><p>${expiry}</p>`,
        },
      },
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
