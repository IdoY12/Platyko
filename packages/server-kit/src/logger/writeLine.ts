/**
 * Writes one timestamped log line to the appropriate console stream.
 *
 * Responsibility: shared log line formatting for INFO/WARN/ERROR, tagged with the request id when inside one.
 * Layer: @project/server-kit/logger
 * Depends on: formatMeta.ts, requestContext.ts
 * Consumers: logInfo.ts, logWarn.ts, logError.ts
 */

import type { LogMeta } from "./formatMeta.js";
import { formatMeta } from "./formatMeta.js";
import { currentRequestId } from "./requestContext.js";

export function writeLine(level: "INFO" | "ERROR" | "WARN", prefix: string, message: string, meta?: LogMeta) {
  const timestamp = new Date().toISOString();
  const requestId = currentRequestId();
  const requestTag = requestId ? ` [rid=${requestId}]` : "";
  const line = `[${timestamp}] [${level}]${requestTag} ${prefix} ${message}${formatMeta(meta)}`;

  if (level === "ERROR") return void console.error(line);

  if (level === "WARN") return void console.warn(line);
  console.log(line);
}
