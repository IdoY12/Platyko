/**
 * Shared rules for rejecting weak or placeholder secrets during production validation.
 *
 * Responsibility: placeholder detection, minimum length, one assertion reused by both gates.
 * Layer: @project/server-kit/validate
 * Depends on: none
 * Consumers: validateBackendSecurity.ts, validateIoSecurity.ts
 */

/** Exact values shipped in config/*.json or .env.example that must never reach production. */
const PLACEHOLDER_SECRETS = new Set(["change-me", "change-me-too", "secret", "jwtsecret", "mysecret"]);

/** Any secret containing one of these was clearly typed by a human, not generated. */
const PLACEHOLDER_SUBSTRINGS = ["change-me", "local-dev", "placeholder", "example", "secret", "password", "test"];

export const MIN_JWT_SECRET_LENGTH = 32;

export function isPlaceholderSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_SECRETS.has(normalized) || PLACEHOLDER_SUBSTRINGS.some((s) => normalized.includes(s));
}

/** Throws unless `value` is a long, generated-looking secret. `key` names the config path in the error. */
export function assertStrongSecret(key: string, value: string | undefined, envHint: string): void {
  if (!value?.trim()) throw new Error(`Missing required configuration: ${key} (${envHint})`);
  if (value.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`${key} must be at least ${MIN_JWT_SECRET_LENGTH} characters (${envHint})`);
  }
  if (isPlaceholderSecret(value)) {
    throw new Error(`${key} looks like a placeholder; generate it with "openssl rand -hex 32" (${envHint})`);
  }
}
