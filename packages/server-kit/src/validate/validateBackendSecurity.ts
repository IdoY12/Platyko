/**
 * Production security gate for the REST backend (JWT, DB, Express CORS, Resend).
 *
 * Responsibility: fail fast on weak/missing secrets or unsafe CORS before listening.
 * Layer: @project/server-kit/validate
 * Depends on: jwtSecretRules.ts, assertPostgresUrl.ts, assertNonWildcardOrigin.ts, config
 * Consumers: backend/src/index.ts
 */

import config from "config";
import { assertNonWildcardOrigin } from "./assertNonWildcardOrigin.js";
import { assertPostgresUrl } from "./assertPostgresUrl.js";
import { assertStrongSecret } from "./jwtSecretRules.js";

function assertPrefixed(key: string, value: string | undefined, prefix: string, envHint: string): void {
  if (!value?.trim()) throw new Error(`Missing required configuration: ${key} (${envHint})`);
  if (!value.trim().startsWith(prefix)) throw new Error(`${key} must start with "${prefix}" (${envHint})`);
}

export function validateBackendProductionSecuritySettings(): void {
  if (!config.get<boolean>("app.validateSecurity")) return;

  const accessSecret = config.get<string>("app.jwtAccessSecret");
  const refreshSecret = config.get<string>("app.jwtRefreshSecret");
  assertStrongSecret("app.jwtAccessSecret", accessSecret, "set JWT_ACCESS_SECRET");
  assertStrongSecret("app.jwtRefreshSecret", refreshSecret, "set JWT_REFRESH_SECRET");
  if (accessSecret.trim() === refreshSecret.trim()) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different secrets");
  }

  assertPrefixed("resend.apiKey", config.get<string>("resend.apiKey"), "re_", "set RESEND_API_KEY");
  assertPrefixed("resend.webhookSecret", config.get<string>("resend.webhookSecret"), "whsec_", "set RESEND_WEBHOOK_SECRET");

  assertPostgresUrl(config.get<string>("database.url"), "database.url");
  assertNonWildcardOrigin(config.get<string>("app.cors.origin"), "set CORS_ORIGIN");
  if (!config.get<boolean>("app.trustProxy")) {
    throw new Error("app.trustProxy must be true in production so rate limits key on the real client IP");
  }
}
