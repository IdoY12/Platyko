/**
 * Assigns every request a random id, echoes it as `X-Request-Id`, and opens the logger's
 * request context so each log line written while handling it carries the same id.
 *
 * Responsibility: correlation between a client-visible error and the server log that explains it.
 * Layer: backend middlewares
 * Depends on: @project/server-kit/logger (runWithRequestId)
 * Consumers: app.ts (mounted first)
 */

import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { runWithRequestId } from "../utils/logger.js";

export function requestId(_req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  runWithRequestId(id, next);
}
