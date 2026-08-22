/**
 * Registers `rematch_request` so matched players can start a new duel after finishing.
 *
 * Responsibility: coordinate rematch acknowledgement and spawn a fresh session.
 * Layer: io duel handlers
 * Depends on: rematchEntries state, finalizeMatch
 * Consumers: duel/index.ts
 */

import { logInfo } from "../../../utils/logger.js";
import { finalizeMatch } from "../queue.js";
import { rematchEntries } from "../state.js";
import type { DuelNamespace, DuelSocket, QueueEntry } from "../types.js";

export function registerRematchAbandoned(socket: DuelSocket, duel: DuelNamespace) {
  socket.on("rematch_abandoned", (payload: { session_id?: unknown } | undefined) => {
    const sessionId = typeof payload?.session_id === "string" ? payload.session_id : "";
    const entry = rematchEntries.get(sessionId);
    if (!entry) return;
    const userId = socket.data.authenticatedUserId;
    if (!userId) return;
    if (entry.player1.userId !== userId && entry.player2.userId !== userId) return;
    if (entry.timer) clearTimeout(entry.timer);
    rematchEntries.delete(sessionId);
    // Only a genuine requester (already in entry.requests) may be told the opponent
    // left; a player merely viewing Results never asked, so they stay undisturbed.
    const otherUserId = entry.player1.userId === userId ? entry.player2.userId : entry.player1.userId;
    const waitingSocketId = entry.requests.get(otherUserId);
    if (waitingSocketId) duel.to(waitingSocketId).emit("rematch_declined", { reason: "opponent_left" });
    logInfo("[DUEL]", "rematch:abandoned", { userId, sessionId });
  });
}

export function registerRematchRequest(socket: DuelSocket, duel: DuelNamespace) {
  socket.on("rematch_request", (payload: { session_id?: unknown } | undefined) => {
    const sessionId = typeof payload?.session_id === "string" ? payload.session_id : "";
    const entry = rematchEntries.get(sessionId);
    if (!entry) {
      socket.emit("rematch_declined", { reason: "expired" });
      return;
    }

    const userId = socket.data.authenticatedUserId;
    if (!userId) return;

    const isPlayer1 = entry.player1.userId === userId;
    const isPlayer2 = entry.player2.userId === userId;
    if (!isPlayer1 && !isPlayer2) return;

    // Only genuine rematch_request emitters count toward the gate; seeding the
    // opponent here would fabricate a session they never agreed to (orphaned duel).
    entry.requests.set(userId, socket.id);
    logInfo("[DUEL]", "rematch:request", { userId, sessionId });

    if (entry.isSolo || entry.requests.size >= 2) {
      if (entry.timer) clearTimeout(entry.timer);
      rematchEntries.delete(sessionId);

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
