/**
 * Single Resend SDK client + sending identity for all transactional email.
 *
 * Responsibility: read resend.* config once; expose a lazily created client.
 * Layer: backend services/auth
 * Depends on: config, resend
 * Consumers: sendBrandedEmail.ts, controllers/webhooks/resendWebhookHandler.ts
 */

import config from "config";
import { Resend } from "resend";

export const RESEND_FROM_EMAIL = "Platyko <noreply@platyko.com>";

const resendCfg = config.get<AppConfig["resend"]>("resend");

export const resendWebhookSecret = resendCfg.webhookSecret.trim();

let client: Resend | undefined;

/**
 * Created on first use, not at import: the SDK throws when the key is empty,
 * and development must start without one (sends then fail and are logged).
 */
export function getResendClient(): Resend {
  client ??= new Resend(resendCfg.apiKey.trim());
  return client;
}
