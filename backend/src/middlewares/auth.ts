import { NextFunction, Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../@types/auth.js";
import { logError, logInfo, logWarn } from "../utils/logger.js";
import { verifyAccessToken } from "../utils/sessionJwtTokens.js";

export async function authMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    logWarn("[AUTH]", "missing-bearer-token", { path: request.originalUrl });
    response.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const token = authHeader.slice(7);

  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, tokenVersion: true },
    });

    if (!user) {
      logWarn("[AUTH]", "user-not-found-for-token", { userId: decoded.userId, path: request.originalUrl });
      response.status(401).json({ error: "Invalid token" });
      return;
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      logWarn("[AUTH]", "token-version-mismatch", { userId: decoded.userId, path: request.originalUrl });
      response.status(401).json({ error: "Invalid token" });
      return;
    }
    logInfo("[AUTH]", "access-token-validated", { userId: decoded.userId, path: request.originalUrl });
    request.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    logError("[AUTH]", error, { path: request.originalUrl, reason: "invalid-access-token" });
    response.status(401).json({ error: "Invalid token" });
  }
}

/** Attaches `request.user` when a valid Bearer token is present; otherwise continues without auth (no 401). */
export async function optionalAuthMiddleware(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  delete request.user;
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, tokenVersion: true },
    });
    if (!user) {
      next();
      return;
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      next();
      return;
    }
    request.user = { userId: decoded.userId, email: decoded.email };
  } catch {
    // Invalid token on an optional-auth route: treat as anonymous.
  }
  next();
}
