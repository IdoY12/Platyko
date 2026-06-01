/**
 * Registers `rematch_request` so matched players can start a new duel after finishing.
 *
 * Responsibility: coordinate rematch acknowledgement and spawn a fresh session.
 * Layer: io duel handlers
 * Depends on: rematchEntries state, finalizeMatch
 * Consumers: duel/index.ts
 */

import type { Socket } from "socket.io";
import { logInfo } from "../../../utils/logger.js";
import { finalizeMatch } from "../queue.js";
import { rematchEntries } from "../state.js";
import type { DuelNamespace, QueueEntry } from "../types.js";

function cacheSocketId(duel: DuelNamespace, userId: string, into: Map<string, string>): void {
  if (into.has(userId)) return;
  for (const [sid, sock] of duel.sockets) if (sock.data.authenticatedUserId === userId) { into.set(userId, sid); break; }
}

export function registerRematchAbandoned(socket: Socket, duel: DuelNamespace) {
  socket.on("rematch_abandoned", (payload: { session_id: string }) => {
    const entry = rematchEntries.get(payload.session_id);
    if (!entry) return;
    const userId = socket.data.authenticatedUserId as string | undefined;
    if (!userId) return;
    if (entry.player1.userId !== userId && entry.player2.userId !== userId) return;
    if (entry.timer) clearTimeout(entry.timer);
    rematchEntries.delete(payload.session_id);
    const otherUserId = entry.player1.userId === userId ? entry.player2.userId : entry.player1.userId;
    cacheSocketId(duel, otherUserId, entry.requests);
    const waitingSocketId = entry.requests.get(otherUserId);
    if (waitingSocketId) duel.to(waitingSocketId).emit("rematch_declined", { reason: "opponent_left" });
    logInfo("[DUEL]", "rematch:abandoned", { userId, sessionId: payload.session_id });
  });
}

export function registerRematchRequest(socket: Socket, duel: DuelNamespace) {
  socket.on("rematch_request", (payload: { session_id: string }) => {
    const entry = rematchEntries.get(payload.session_id);
    if (!entry) {
      socket.emit("rematch_declined", { reason: "expired" });
      return;
    }

    const userId = socket.data.authenticatedUserId as string | undefined;
    if (!userId) return;

    const isPlayer1 = entry.player1.userId === userId;
    const isPlayer2 = entry.player2.userId === userId;
    if (!isPlayer1 && !isPlayer2) return;

    entry.requests.set(userId, socket.id);
    const opponentUserId = isPlayer1 ? entry.player2.userId : entry.player1.userId;
    cacheSocketId(duel, opponentUserId, entry.requests);
    logInfo("[DUEL]", "rematch:request", { userId, sessionId: payload.session_id });

    if (entry.isSolo || entry.requests.size >= 2) {
      if (entry.timer) clearTimeout(entry.timer);
      rematchEntries.delete(payload.session_id);

      const p1SocketId = entry.requests.get(entry.player1.userId);
      const p2SocketId = entry.isSolo ? `solo:${p1SocketId}` : entry.requests.get(entry.player2.userId);

      if (!p1SocketId || (!entry.isSolo && !p2SocketId)) {
        socket.emit("rematch_declined", { reason: "expired" });
        return;
      }

      const p1: QueueEntry = { ...entry.player1, socketId: p1SocketId };
      const p2: QueueEntry = entry.isSolo
        ? { ...entry.player1, socketId: `solo:${p1SocketId}` }
        : { ...entry.player2, socketId: p2SocketId! };

      finalizeMatch(duel, p1, p2);
    }
  });
}
