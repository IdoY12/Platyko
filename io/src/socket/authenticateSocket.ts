import type { DefaultEventsMap, Namespace, Socket } from "socket.io";
import { prisma } from "@project/db";
import { verifySocketAccessToken } from "../auth/verifySocketAccessToken.js";
import { logInfo } from "../utils/logger.js";

/** A socket that passed authentication carries its user's id. */
export type AuthenticatedSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { authenticatedUserId?: string }>;

/**
 * Accepts a connection only with a valid access token whose `tokenVersion` still matches the
 * user (PRD 11.9: a revoked session cannot keep playing). Used by every namespace.
 */
export function attachSocketAuthentication(namespace: Namespace, logTag: string): void {
  // authenticate handles every outcome itself, so the returned promise is intentionally not awaited.
  namespace.use((socket, next) => void authenticate(socket as AuthenticatedSocket, next, logTag));
}

async function authenticate(socket: AuthenticatedSocket, next: (err?: Error) => void, logTag: string): Promise<void> {
  const rawToken = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  const token = typeof rawToken === "string" ? rawToken : "";
  if (!token) {
    next(new Error("Authentication required"));
    return;
  }
  try {
    const decoded = verifySocketAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, tokenVersion: true } });
    if (!user) {
      logInfo(logTag, "socket:user-not-found", { socketId: socket.id });
      next(new Error("Invalid token"));
      return;
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      logInfo(logTag, "socket:token-version-mismatch", { socketId: socket.id });
      next(new Error("Token revoked"));
      return;
    }
    socket.data.authenticatedUserId = decoded.userId;
    next();
  } catch (error) {
    // Only a token problem is an auth failure; a DB outage must not look like one to the client.
    const tokenProblem = error instanceof Error && /token|jwt|signature|expired/i.test(error.name + error.message);
    logInfo(logTag, tokenProblem ? "socket:invalid-token" : "socket:auth-unavailable", { socketId: socket.id });
    next(new Error(tokenProblem ? "Invalid token" : "Service unavailable"));
  }
}
