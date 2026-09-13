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
import { MIN_JWT_SECRET_LENGTH, PLACEHOLDER_JWT_SECRETS, normalizeSecret } from "./jwtSecretRules.js";

export function validateBackendProductionSecuritySettings(): void {
  if (!config.get<boolean>("app.validateSecurity")) return;

  (
    [
      ["app.jwtAccessSecret", config.get<string>("app.jwtAccessSecret")],
      ["app.jwtRefreshSecret", config.get<string>("app.jwtRefreshSecret")],
    ] as const
  ).forEach(([key, value]) => {
    if (!value?.trim()) throw new Error(`Missing required configuration: ${key}`);

    if (value.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(`${key} must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
    }

    if (PLACEHOLDER_JWT_SECRETS.has(normalizeSecret(value))) {
      throw new Error(`${key} must not use a known placeholder; set strong secrets via environment`);
    }
  });

  (["resend.apiKey", "resend.webhookSecret"] as const).forEach((key) => {
    if (!config.get<string>(key)?.trim()) throw new Error(`Missing required configuration: ${key} (set RESEND_API_KEY / RESEND_WEBHOOK_SECRET)`);
  });

  assertPostgresUrl(config.get<string>("database.url"), "database.url");
  assertNonWildcardOrigin(config.get<string>("app.cors.origin"), "set CORS_ORIGIN");
}
