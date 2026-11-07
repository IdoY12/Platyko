import { NextFunction, Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../@types/auth.js";
import { logInfo, logWarn } from "../utils/logger.js";
import { verifyAccessToken } from "../utils/sessionJwtTokens.js";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailableError } from "../utils/dbErrors.js";

type BearerResolution =
  | { user: NonNullable<AuthenticatedRequest["user"]> }
  | { rejected: "missing-bearer-token" | "user-not-found-for-token" | "token-version-mismatch" | "invalid-access-token"; reason?: string }
  | { unavailable: true };

/** Verifies the Bearer access token and that its tokenVersion still matches the user row. */
async function resolveBearerUser(authHeader: string | undefined): Promise<BearerResolution> {
  if (!authHeader?.startsWith("Bearer ")) return { rejected: "missing-bearer-token" };
  let decoded: ReturnType<typeof verifyAccessToken>;
  try {
    decoded = verifyAccessToken(authHeader.slice(7));
  } catch (error) {
    // Expired or malformed tokens are routine client state, not server failures: WARN, no stack.
    return { rejected: "invalid-access-token", reason: error instanceof Error ? error.name : "unknown" };
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { tokenVersion: true } });
    if (!user) return { rejected: "user-not-found-for-token", reason: decoded.userId };
    if (user.tokenVersion !== decoded.tokenVersion) return { rejected: "token-version-mismatch", reason: decoded.userId };
    return { user: { userId: decoded.userId, email: decoded.email } };
  } catch (error) {
    // A valid token with an unreachable DB must not look like a bad token (the client would refresh / sign out).
    if (isDatabaseUnavailableError(error)) return { unavailable: true };
    throw error;
  }
}

export async function authMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const resolution = await resolveBearerUser(request.headers.authorization);
  if ("unavailable" in resolution) {
    response.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
    return;
  }
  if ("rejected" in resolution) {
    logWarn("[AUTH]", resolution.rejected, { path: request.originalUrl, reason: resolution.reason });
    response.status(401).json({ error: resolution.rejected === "missing-bearer-token" ? "Missing bearer token" : "Invalid token" });
    return;
  }
  logInfo("[AUTH]", "access-token-validated", { userId: resolution.user.userId, path: request.originalUrl });
  request.user = resolution.user;
  next();
}

/** Attaches `request.user` when a valid Bearer token is present; otherwise continues as anonymous (no 401). */
export async function optionalAuthMiddleware(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  const resolution = await resolveBearerUser(request.headers.authorization);
  if ("user" in resolution) request.user = resolution.user;
  else delete request.user;
  next();
}
