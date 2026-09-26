/**
 * Production security gate for the Socket.IO duel service (access JWT secret, DB, CORS).
 *
 * Responsibility: align io deployment rules with backend secret strength checks.
 * Layer: @project/server-kit/validate
 * Depends on: jwtSecretRules.ts, assertPostgresUrl.ts, assertNonWildcardOrigin.ts, config
 * Consumers: io/src/index.ts
 */

import config from "config";
import { assertNonWildcardOrigin } from "./assertNonWildcardOrigin.js";
import { assertPostgresUrl } from "./assertPostgresUrl.js";
import { assertStrongSecret } from "./jwtSecretRules.js";

export function validateIoProductionSecuritySettings(): void {
  if (!config.get<boolean>("app.validateSecurity")) return;

  assertStrongSecret("app.jwtAccessSecret", config.get<string>("app.jwtAccessSecret"), "set JWT_ACCESS_SECRET");
  assertPostgresUrl(config.get<string>("database.url"), "database.url");
  assertNonWildcardOrigin(config.get<string>("io.cors.origin"), "set IO_CORS_ORIGIN");
}
