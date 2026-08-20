import type { Socket } from "socket.io";
import { logInfo } from "../../../utils/logger.js";
import { clearSoloMatchTimer } from "../queue.js";
import { onDuelParticipantGone } from "../duelParticipantGone.js";
import { broadcastQueueStatus, queue, sessions, rematchEntries } from "../state.js";
import type { DuelNamespace } from "../types.js";

export function registerDisconnect(socket: Socket, duel: DuelNamespace) {
  socket.on("disconnect", () => {
    logInfo("[DUEL]", "socket:disconnected", { socketId: socket.id });
    const queued = queue.findIndex((entry) => entry.socketId === socket.id);
    if (queued >= 0) queue.splice(queued, 1);
    clearSoloMatchTimer(socket.id);

    sessions.forEach((session, sessionId) => {
      if (session.player1.socketId === socket.id || session.player2.socketId === socket.id) {
        onDuelParticipantGone(duel, socket.id, session, sessionId, true);
      }
    });

    rematchEntries.forEach((entry, sessionId) => {
      const isPlayer1 = entry.player1.socketId === socket.id || entry.requests.get(entry.player1.userId) === socket.id;
      const isPlayer2 = entry.player2.socketId === socket.id || entry.requests.get(entry.player2.userId) === socket.id;
      if (!isPlayer1 && !isPlayer2) return;

      if (entry.timer) clearTimeout(entry.timer);
      rematchEntries.delete(sessionId);

      const waitingSocketId = isPlayer1
        ? entry.requests.get(entry.player2.userId)
        : entry.requests.get(entry.player1.userId);
      if (waitingSocketId) duel.to(waitingSocketId).emit("rematch_declined", { reason: "opponent_left" });
    });
    if (socket.data.authenticatedUserId) broadcastQueueStatus(duel, socket.id);
  });

  socket.on("leave_duel", (payload: { session_id?: string }) => {
    const sessionId = typeof payload?.session_id === "string" ? payload.session_id : "";
    if (!sessionId) return;
    const session = sessions.get(sessionId);
    if (!session) return;
    onDuelParticipantGone(duel, socket.id, session, sessionId, false);
  });
}
