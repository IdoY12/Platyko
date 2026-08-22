import { prisma } from "@project/db";
import { verifySocketAccessToken } from "../../../auth/verifySocketAccessToken.js";
import { logInfo } from "../../../utils/logger.js";
import type { DuelNamespace, DuelSocket } from "../types.js";

export function attachDuelConnectionAuthentication(duelNamespace: DuelNamespace): void {
  // authenticateDuelSocket handles every outcome itself, so the returned promise is intentionally not awaited.
  duelNamespace.use((socket, next) => void authenticateDuelSocket(socket, next));
}

async function authenticateDuelSocket(socket: DuelSocket, next: (err?: Error) => void): Promise<void> {
  const handshakeAuth = socket.handshake.auth as { token?: unknown } | undefined;
  const rawToken = handshakeAuth?.token;
  const token = typeof rawToken === "string" ? rawToken : "";

  if (!token) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    const decoded = verifySocketAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, tokenVersion: true },
    });

    if (!user) {
      logInfo("[DUEL]", "socket:user-not-found", { socketId: socket.id });
      next(new Error("Invalid token"));
      return;
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      logInfo("[DUEL]", "socket:token-version-mismatch", { socketId: socket.id });
      next(new Error("Token revoked"));
      return;
    }
    socket.data.authenticatedUserId = decoded.userId;
    next();
  } catch {
    logInfo("[DUEL]", "socket:invalid-token", { socketId: socket.id });
    next(new Error("Invalid token"));
  }
}
