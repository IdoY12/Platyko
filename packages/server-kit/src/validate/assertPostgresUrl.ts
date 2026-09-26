/**
 * Validates that `database.url` points at PostgreSQL with a real password when security checks run.
 *
 * Responsibility: single place for DATABASE_URL scheme and placeholder-credential enforcement.
 * Layer: @project/server-kit/validate
 * Depends on: none
 * Consumers: validateBackendSecurity.ts, validateIoSecurity.ts
 */

/** The docker-compose / README development credentials; production must never reuse them. */
const DEVELOPMENT_DB_CREDENTIALS = "postgres:postgres@";

export function assertPostgresUrl(dbUrl: string, configKey: string): void {
  if (!dbUrl?.trim()) {
    throw new Error(`Missing required configuration: ${configKey}`);
  }

  if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
    throw new Error(`${configKey} must be a PostgreSQL connection URL`);
  }

  if (dbUrl.includes(DEVELOPMENT_DB_CREDENTIALS)) {
    throw new Error(`${configKey} uses the development postgres:postgres credentials; set a real POSTGRES_PASSWORD`);
  }
}
