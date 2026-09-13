import type { Request, Response } from "express";
import { prisma } from "@project/db";
import type { WebhookEventPayload } from "resend";
import { getResendClient, resendWebhookSecret } from "../../services/auth/resendClient.js";
import { logError, logInfo, logWarn } from "../../utils/logger.js";

/** The route is mounted with express.raw: the signature covers the exact bytes Resend sent. */
function verifyResendEvent(request: Request): WebhookEventPayload {
  return getResendClient().webhooks.verify({
    payload: Buffer.isBuffer(request.body) ? request.body.toString("utf8") : "",
    headers: {
      id: request.header("svix-id") ?? "",
      timestamp: request.header("svix-timestamp") ?? "",
      signature: request.header("svix-signature") ?? "",
    },
    webhookSecret: resendWebhookSecret,
  });
}

/**
 * Resend → backend webhook. On `email.bounced` / `email.complained` it flags
 * every recipient's User row (`emailBounced`) so sendBrandedEmail stops mailing
 * them. Other event types are acknowledged and ignored. Unverifiable requests
 * get 400; verified ones always get 2xx unless the DB write fails, so Resend
 * only retries transient failures.
 */
export async function resendWebhookHandler(request: Request, response: Response): Promise<void> {
  let event: WebhookEventPayload;
  try {
    event = verifyResendEvent(request);
  } catch (error) {
    logWarn("[MAIL]", "webhook:rejected", { reason: error instanceof Error ? error.message : String(error) });
    response.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  if (event.type !== "email.bounced" && event.type !== "email.complained") {
    response.json({ received: true });
    return;
  }

  const recipients = event.data.to;
  try {
    const { count } = await prisma.user.updateMany({
      where: { email: { in: recipients } },
      data: { emailBounced: true },
    });
    logInfo("[MAIL]", `webhook:${event.type}`, { recipients, flagged: count });
    response.json({ received: true });
  } catch (error) {
    logError("[MAIL]", error, { phase: `webhook:${event.type}` });
    response.status(500).json({ error: "Could not process the event" });
  }
}
