/**
 * Emits an ERROR-level log entry, normalizing Error objects into metadata.
 *
 * Responsibility: capture stack traces without leaking sensitive fields.
 * Layer: @project/server-kit/logger
 * Depends on: writeLine.ts, formatMeta.ts
 * Consumers: backend and io error paths
 */

import type { LogMeta } from "./formatMeta.js";
import { writeLine } from "./writeLine.js";

/** Third-party error text (Resend, Prisma) can quote an address; keys are already redacted, text is not. */
const maskEmails = (text: string | undefined) => text?.replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi, "***EMAIL***");

export function logError(prefix: string, error: unknown, meta?: LogMeta) {
  const payload = {
    ...(meta ?? {}),
    error:
      error instanceof Error
        ? { name: error.name, message: maskEmails(error.message), stack: maskEmails(error.stack) }
        : { message: maskEmails(String(error)) },
  };
  writeLine("ERROR", prefix, "failure", payload);
}
