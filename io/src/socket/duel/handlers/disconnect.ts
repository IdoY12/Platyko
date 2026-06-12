import type { Socket } from "socket.io";
import { XP_PER_CORRECT_EXERCISE } from "@project/xp-constants";
import { applyXpReward } from "../services/rewards.js";
import { persistDuelSession } from "../persistence.js";
import { logInfo } from "../../../utils/logger.js";
import { clearSoloMatchTimer } from "../queue.js";
import { clearSessionRoundTimer } from "../roundTimeout.js";
import { broadcastQueueStatus, queue, sessions, rematchEntries } from "../state.js";
import type { DuelNamespace, SessionState } from "../types.js";

function onDuelParticipantGone(duel: DuelNamespace, leaverSocketId: string, session: SessionState, sessionId: string) {
  const soloOpponent = session.player2.socketId.startsWith("solo:");
  if (soloOpponent && session.player1.socketId === leaverSocketId) {
    clearSessionRoundTimer(session);
    sessions.delete(sessionId);
    return;
  }
  if (session.player1.socketId !== leaverSocketId && session.player2.socketId !== leaverSocketId) return;
  if (session.abandonInProgress) return;
  session.abandonInProgress = true;
  clearSessionRoundTimer(session);
  const survivor = session.player1.socketId === leaverSocketId ? session.player2 : session.player1;
  const survivorIsP1 = survivor === session.player1;
  void persistDuelSession(session, survivor.userId);
  duel.to(survivor.socketId).emit("opponent_disconnected", { at_round: session.round });
  const survivorStreakDate = survivorIsP1 ? session.player1StreakLocalDate : session.player2StreakLocalDate;
  void applyXpReward(survivor.userId, XP_PER_CORRECT_EXERCISE, survivorStreakDate)
    .catch(() => 0)
    .then((streakCurrent) => {
      duel.to(survivor.socketId).emit("duel_end", {
        winner_user_id: survivor.userId,
        my_score: survivorIsP1 ? session.score.player1 : session.score.player2,
        opp_score: survivorIsP1 ? session.score.player2 : session.score.player1,
        xp_earned: XP_PER_CORRECT_EXERCISE,
        round_replay: session.roundReplay,
        streak_current: streakCurrent,
      });
      sessions.delete(sessionId);
    });
}

export function registerDisconnect(socket: Socket, duel: DuelNamespace) {
  socket.on("disconnect", () => {
    logInfo("[DUEL]", "socket:disconnected", { socketId: socket.id });
    const queued = queue.findIndex((entry) => entry.socketId === socket.id);
    if (queued >= 0) queue.splice(queued, 1);
    clearSoloMatchTimer(socket.id);

    sessions.forEach((session, sessionId) => {
      if (session.player1.socketId === socket.id || session.player2.socketId === socket.id) {
        onDuelParticipantGone(duel, socket.id, session, sessionId);
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
    onDuelParticipantGone(duel, socket.id, session, sessionId);
  });
}
