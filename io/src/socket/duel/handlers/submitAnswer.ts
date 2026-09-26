/**
 * Registers `submit_answer` so only duel participants can score for their side.
 *
 * Responsibility: validate answer server-side and delegate correct-answer flow.
 * Layer: io duel handlers
 * Depends on: applyCorrectDuelAnswer, resolveDuelPlayerSlot, session state, payload guards
 * Consumers: duel/index.ts
 */

import { logError, logInfo } from "../../../utils/logger.js";
import { advanceDuelRoundNoWinner, applyCorrectDuelAnswer } from "../applyCorrectDuelAnswer.js";
import { resolveDuelPlayerSlot } from "../resolveDuelPlayerSlot.js";
import { isThrottled } from "../../../utils/socketThrottle.js";
import { readStreakLocalDate, readSubmitAnswerPayload } from "../payloadGuards.js";
import { sessions, tryClaimDuelRound } from "../state.js";
import type { DuelNamespace, DuelSocket } from "../types.js";
import { DUEL_MAX_ATTEMPTS_PER_ROUND } from "../../../constants/duelRoundConstants.js";

export function registerSubmitAnswer(socket: DuelSocket, duel: DuelNamespace) {
  socket.on("submit_answer", (rawPayload: unknown) => {
    try {
      if (isThrottled(socket, "submit_answer", 300)) return;
      const payload = readSubmitAnswerPayload(rawPayload);
      if (!payload) return;
      const session = sessions.get(payload.sessionId);
      if (!session || session.answered || !session.currentQuestion) return;
      if (payload.roundNumber !== session.round) return;

      const slot = resolveDuelPlayerSlot(session, socket, socket.data.authenticatedUserId);
      if (!slot) {
        logInfo("[DUEL]", "submit_answer:rejected-non-participant", { socketId: socket.id });
        return;
      }

      const attempts = slot === "player1" ? session.player1Attempts : session.player2Attempts;
      if (attempts >= DUEL_MAX_ATTEMPTS_PER_ROUND) return;

      const { correctAnswer } = session.currentQuestion;
      const streakDate = readStreakLocalDate(rawPayload);

      if (payload.answer !== correctAnswer) {
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
      applyCorrectDuelAnswer(duel, session, session.currentQuestion, slot === "player1", payload.timeTakenMs);
    } catch (error) {
      logError("[DUEL]", error, { phase: "submit_answer" });
    }
  });
}
