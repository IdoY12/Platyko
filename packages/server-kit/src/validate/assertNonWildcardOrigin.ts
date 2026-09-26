/**
 * Ensures a CORS origin config is explicit (not empty, not `*`) and HTTPS-only.
 *
 * Responsibility: block insecure open CORS when validateSecurity is enabled.
 * Layer: @project/server-kit/validate
 * Depends on: none
 * Consumers: validateBackendSecurity.ts, validateIoSecurity.ts
 */

export function assertNonWildcardOrigin(origin: string, envHint: string): void {
  if (!origin?.trim() || origin.includes("*")) {
    throw new Error(
      `CORS origin must be a non-empty explicit origin or comma-separated list when app.validateSecurity is true (${envHint})`,
    );
  }
  const insecure = origin.split(",").map((part) => part.trim()).find((part) => !part.startsWith("https://"));
  if (insecure) {
    throw new Error(`CORS origin "${insecure}" must use https:// in production (${envHint})`);
  }
}
