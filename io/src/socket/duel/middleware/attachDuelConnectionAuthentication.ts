import type { Server } from "socket.io";
import { prisma } from "@project/db";
import { verifySocketAccessToken } from "../../../auth/verifySocketAccessToken.js";
import { logInfo } from "../../../utils/logger.js";

export function attachDuelConnectionAuthentication(duelNamespace: ReturnType<Server["of"]>): void {
  duelNamespace.use(async (socket, next) => {
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
  });
}
