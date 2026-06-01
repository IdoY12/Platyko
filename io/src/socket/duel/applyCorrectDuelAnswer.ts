/**
 * Updates session score/replay, broadcasts round_result, and schedules next round or end.
 *
 * Responsibility: shared path after a participant submits the correct answer.
 * Layer: io duel session
 * Depends on: DUEL_ROUND_COUNT, endSession, startRound
 * Consumers: submitAnswer handler
 */

import { XP_PER_CORRECT_EXERCISE } from "@project/xp-constants";
import { DUEL_ROUND_COUNT, DUEL_BETWEEN_ROUNDS_DELAY_MS } from "../../constants/duelRoundConstants.js";
import { applyXpReward } from "./services/rewards.js";
import { sessions } from "./state.js";
import { endSession } from "./endSession.js";
import { startRound } from "./startRound.js";
import type { CachedQuestion, DuelNamespace, SessionState } from "./types.js";

export function advanceDuelRoundNoWinner(
  duel: DuelNamespace,
  session: SessionState,
  question: CachedQuestion,
): void {
  duel.to(session.roomId).emit("round_result", {
    winner_user_id: null, correct_answer: question.correctAnswer, explanation: question.explanation,
    scores: { player1: session.score.player1, player2: session.score.player2 },
    player_ids: { player1: session.player1.userId, player2: session.player2.userId },
    response_times: { player1_ms: 0, player2_ms: 0 },
  });
  session.roundReplay.push({ roundNumber: session.round, winnerUserId: null, correctAnswer: question.correctAnswer, player1TimeMs: 0, player2TimeMs: 0 });
  setTimeout(() => {
    if (!sessions.has(session.sessionId)) return;
    if (session.round >= DUEL_ROUND_COUNT) void endSession(duel, session); else void startRound(duel, session.sessionId);
  }, DUEL_BETWEEN_ROUNDS_DELAY_MS);
}

export function applyCorrectDuelAnswer(
  duel: DuelNamespace,
  session: SessionState,
  question: CachedQuestion,
  answeredByPlayer1: boolean,
  timeTakenMs: number,
): void {
  const player1TimeMs = answeredByPlayer1 ? timeTakenMs : 0;
  const player2TimeMs = answeredByPlayer1 ? 0 : timeTakenMs;

  if (answeredByPlayer1) {
    session.score.player1 += 1;
    session.xpGrantedP1 += XP_PER_CORRECT_EXERCISE;
  } else {
    session.score.player2 += 1;
    session.xpGrantedP2 += XP_PER_CORRECT_EXERCISE;
  }
  const xpUserId = answeredByPlayer1 ? session.player1.userId : session.player2.userId;
  const xpStreakDate = answeredByPlayer1 ? session.player1StreakLocalDate : session.player2StreakLocalDate;
  void applyXpReward(xpUserId, XP_PER_CORRECT_EXERCISE, xpStreakDate);
  session.roundReplay.push({
    roundNumber: session.round,
    winnerUserId: answeredByPlayer1 ? session.player1.userId : session.player2.userId,
    correctAnswer: question.correctAnswer,
    player1TimeMs,
    player2TimeMs,
  });
  duel.to(session.roomId).emit("round_result", {
    winner_user_id: answeredByPlayer1 ? session.player1.userId : session.player2.userId,
    correct_answer: question.correctAnswer,
    explanation: question.explanation,
    scores: { player1: session.score.player1, player2: session.score.player2 },
    player_ids: { player1: session.player1.userId, player2: session.player2.userId },
    response_times: { player1_ms: player1TimeMs, player2_ms: player2TimeMs },
  });

  setTimeout(() => {
    if (!sessions.has(session.sessionId)) return;
    if (session.round >= DUEL_ROUND_COUNT) void endSession(duel, session); else void startRound(duel, session.sessionId);
  }, DUEL_BETWEEN_ROUNDS_DELAY_MS);
}
