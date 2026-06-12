/**
 * Server-side duel timeouts so sessions can never hang forever in memory.
 *
 * Responsibility: expire never-started matches; end stalled rounds as no-winner.
 * Layer: io duel session
 * Depends on: state map, advanceDuelRoundNoWinner
 * Consumers: queue.ts (finalizeMatch), startRound.ts, endSession.ts, disconnect handler
 */

import { logInfo } from "../../utils/logger.js";
import { advanceDuelRoundNoWinner } from "./applyCorrectDuelAnswer.js";
import { sessions, tryClaimDuelRound } from "./state.js";
import type { DuelNamespace, SessionState } from "./types.js";

/** Both players matched but round 1 never started (nobody sent player_ready). */
const DUEL_READY_TIMEOUT_MS = 120_000;
/** A round was broadcast but nobody answered correctly or exhausted attempts. */
const DUEL_ROUND_TIMEOUT_MS = 60_000;

export function clearSessionRoundTimer(session: SessionState): void {
  if (session.roundTimer) clearTimeout(session.roundTimer);
  session.roundTimer = undefined;
}

/** Drops a matched session whose players never started round 1 and frees both users. */
export function scheduleReadyTimeout(duel: DuelNamespace, session: SessionState): void {
  clearSessionRoundTimer(session);
  session.roundTimer = setTimeout(() => {
    if (!sessions.has(session.sessionId) || session.round !== 0) return;
    sessions.delete(session.sessionId);
    duel.to(session.roomId).emit("opponent_disconnected", { at_round: 0 });
    logInfo("[DUEL]", "session:expired-before-start", { sessionId: session.sessionId });
  }, DUEL_READY_TIMEOUT_MS);
}

/** Resolves a stalled round as no-winner so the duel always advances or ends. */
export function scheduleRoundTimeout(duel: DuelNamespace, session: SessionState): void {
  clearSessionRoundTimer(session);
  const expectedRound = session.round;
  session.roundTimer = setTimeout(() => {
    if (!sessions.has(session.sessionId) || session.round !== expectedRound) return;
    if (!session.currentQuestion || !tryClaimDuelRound(session)) return;
    logInfo("[DUEL]", "round:timeout", { sessionId: session.sessionId, round: session.round });
    advanceDuelRoundNoWinner(duel, session, session.currentQuestion);
  }, DUEL_ROUND_TIMEOUT_MS);
}
