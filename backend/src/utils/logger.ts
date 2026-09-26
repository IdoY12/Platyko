/**
 * Re-exports shared Node logging helpers for the Express REST API.
 *
 * Responsibility: align backend logs with io redaction and formatting.
 * Layer: backend
 * Depends on: @project/server-kit/logger
 * Consumers: controllers, middlewares, app error handler
 */

export { logError, logInfo, logWarn, runWithRequestId, sanitizeBody } from "@project/server-kit/logger";
