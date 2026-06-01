/**
 * Registers `submit_answer` so only duel participants can score for their side.
 *
 * Responsibility: validate answer server-side and delegate correct-answer flow.
 * Layer: io duel handlers
 * Depends on: applyCorrectDuelAnswer, resolveDuelPlayerSlot, session state
 * Consumers: duel/index.ts
 */

import type { Socket } from "socket.io";
import { logError, logInfo } from "../../../utils/logger.js";
import { advanceDuelRoundNoWinner, applyCorrectDuelAnswer } from "../applyCorrectDuelAnswer.js";
import { resolveDuelPlayerSlot } from "../resolveDuelPlayerSlot.js";
import { isThrottled } from "../../../utils/socketThrottle.js";
import { sessions, tryClaimDuelRound } from "../state.js";
import type { DuelNamespace } from "../types.js";
import { DUEL_MAX_ATTEMPTS_PER_ROUND } from "../../../constants/duelRoundConstants.js";

export function registerSubmitAnswer(socket: Socket, duel: DuelNamespace) {
  socket.on(
    "submit_answer",
    async (payload: { session_id: string; round_number: number; answer: string; time_taken_ms: number; streak_local_date?: string }) => {
      try {
        if (isThrottled(socket, "submit_answer", 300)) return;
        const session = sessions.get(payload.session_id);
        if (!session || session.answered || !session.currentQuestion) return;
        if (payload.round_number !== session.round) return;

        const slot = resolveDuelPlayerSlot(session, socket, socket.data.authenticatedUserId as string | undefined);
        if (!slot) {
          logInfo("[DUEL]", "submit_answer:rejected-non-participant", { socketId: socket.id });
          return;
        }

        if (!Number.isFinite(payload.time_taken_ms) || payload.time_taken_ms < 0) {
          socket.emit("error", { message: "invalid_time_taken" });
          return;
        }

        const { correctAnswer } = session.currentQuestion;
        const streakDate =
          typeof payload.streak_local_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.streak_local_date)
            ? payload.streak_local_date : null;

        if (payload.answer !== correctAnswer) {
          if (session.answered) return;
          const attempts = slot === "player1" ? session.player1Attempts : session.player2Attempts;
          if (attempts >= DUEL_MAX_ATTEMPTS_PER_ROUND) return;
          if (slot === "player1") session.player1Attempts += 1;
          else session.player2Attempts += 1;
          socket.emit("answer_feedback", { isCorrect: false });

          const solo = session.player1.userId === session.player2.userId;
          const bothExhausted = solo
            ? session.player1Attempts >= DUEL_MAX_ATTEMPTS_PER_ROUND
            : session.player1Attempts >= DUEL_MAX_ATTEMPTS_PER_ROUND && session.player2Attempts >= DUEL_MAX_ATTEMPTS_PER_ROUND;
          if (bothExhausted && tryClaimDuelRound(session)) advanceDuelRoundNoWinner(duel, session, session.currentQuestion);
          return;
        }

        if (slot === "player1") session.player1StreakLocalDate = streakDate;
        else session.player2StreakLocalDate = streakDate;
        if (!tryClaimDuelRound(session)) return;
        applyCorrectDuelAnswer(duel, session, session.currentQuestion, slot === "player1", payload.time_taken_ms);
      } catch (error) {
        logError("[DUEL]", error, { phase: "submit_answer" });
      }
    },
  );
}
