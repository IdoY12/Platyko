/**
 * Ends (or survives) a duel when a participant socket goes away.
 *
 * Responsibility: re-attach the slot to the player's other live socket, or abandon the duel.
 * Layer: io duel session
 * Depends on: persistence, rewards, roundTimeout, session state
 * Consumers: disconnect handler, leave_duel handler
 */

import { XP_PER_CORRECT_EXERCISE } from "@project/xp-constants";
import { applyXpReward } from "./services/rewards.js";
import { persistDuelSession } from "./persistence.js";
import { clearSessionRoundTimer } from "./roundTimeout.js";
import { sessions } from "./state.js";
import type { DuelNamespace, SessionState } from "./types.js";

/** Another live authenticated socket of the same user, if one exists (second device / fresh reconnect). */
function findOtherLiveSocketOfUser(duel: DuelNamespace, userId: string, excludeSocketId: string) {
  for (const [socketId, sock] of duel.sockets) {
    if (socketId !== excludeSocketId && sock.connected && sock.data.authenticatedUserId === userId) return sock;
  }
  return null;
}

export function onDuelParticipantGone(
  duel: DuelNamespace,
  leaverSocketId: string,
  session: SessionState,
  sessionId: string,
  /** Disconnects may fail over to the player's other live socket; an explicit leave_duel always forfeits. */
  allowReattach: boolean,
): void {
  const leaverSlot =
    session.player1.socketId === leaverSocketId ? session.player1
    : session.player2.socketId === leaverSocketId ? session.player2 : null;
  if (!leaverSlot || session.abandonInProgress) return;

  if (allowReattach) {
    const otherSocket = findOtherLiveSocketOfUser(duel, leaverSlot.userId, leaverSocketId);
    if (otherSocket) {
      leaverSlot.socketId = otherSocket.id;
      void otherSocket.join(session.roomId);
      return;
    }
  }

  const soloOpponent = session.player2.socketId.startsWith("solo:");
  if (soloOpponent && session.player1.socketId === leaverSocketId) {
    clearSessionRoundTimer(session);
    sessions.delete(sessionId);
    return;
  }
  session.abandonInProgress = true;
  clearSessionRoundTimer(session);
  // Remove synchronously so pending round timers and endSession cannot persist this duel a second time.
  sessions.delete(sessionId);
  const survivor = session.player1.socketId === leaverSocketId ? session.player2 : session.player1;
  const survivorIsP1 = survivor === session.player1;
  void persistDuelSession(session, survivor.userId);
  duel.to(survivor.socketId).emit("opponent_disconnected", { at_round: session.round });
  const survivorStreakDate = survivorIsP1 ? session.player1StreakLocalDate : session.player2StreakLocalDate;
  void applyXpReward(survivor.userId, XP_PER_CORRECT_EXERCISE, survivorStreakDate)
    .then(({ xpAdded, streakCurrent }) => {
      duel.to(survivor.socketId).emit("duel_end", {
        winner_user_id: survivor.userId,
        my_score: survivorIsP1 ? session.score.player1 : session.score.player2,
        opp_score: survivorIsP1 ? session.score.player2 : session.score.player1,
        xp_earned: xpAdded,
        round_replay: session.roundReplay,
        streak_current: streakCurrent,
      });
    });
}
