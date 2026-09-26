/**
 * Terminal middlewares: JSON 404 for unknown routes and the global error handler.
 *
 * Responsibility: never let an internal message, stack, Prisma error or file path reach a client.
 * Client-caused parser errors (malformed JSON, oversized body) keep their 4xx status with a generic
 * message; everything else is logged with its stack and answered as 500 + the request id.
 * Layer: backend middlewares
 * Depends on: logger
 * Consumers: app.ts (mounted last)
 */

import type { NextFunction, Request, Response } from "express";
import { logError } from "../utils/logger.js";

/** Shape body-parser / http-errors give their client-caused failures. */
type HttpError = { status?: unknown; expose?: unknown; type?: unknown };

function clientErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const { status, expose } = error as HttpError;
  return typeof status === "number" && status >= 400 && status < 500 && expose === true ? status : null;
}

const CLIENT_ERROR_MESSAGES: Record<string, string> = {
  "entity.parse.failed": "Malformed JSON payload",
  "entity.too.large": "Request body is too large",
};

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const clientStatus = clientErrorStatus(error);
  if (clientStatus !== null) {
    const { type } = error as HttpError;
    const message = typeof type === "string" ? CLIENT_ERROR_MESSAGES[type] : undefined;
    res.status(clientStatus).json({ error: message ?? "Invalid request" });
    return;
  }
  const requestId = String(res.locals.requestId ?? "");
  logError("[APP]", error, { phase: "express-handler" });
  if (res.headersSent) return;
  res.status(500).json({ error: "Something went wrong", requestId });
}
