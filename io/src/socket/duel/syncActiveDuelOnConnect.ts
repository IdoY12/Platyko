/**
 * Pushes current duel wire state to a reconnecting participant socket.
 *
 * Responsibility: re-join room, refresh socket id, replay missed round_result / round_start.
 * Layer: io duel session
 * Depends on: resolveDuelPlayerSlot, roundStartPayload, session map
 * Consumers: duel/index.ts
 */

import { prisma } from "@project/db";
import { logInfo } from "../../utils/logger.js";
import { resolveDuelPlayerSlot } from "./resolveDuelPlayerSlot.js";
import { roundStartPayload } from "./startRound.js";
import { findActiveSessionForUser } from "./state.js";
import type { DuelSocket, SessionState } from "./types.js";

function roundResultPayload(session: SessionState) {
  const last = session.roundReplay.at(-1);
  if (!last || last.roundNumber !== session.round) return null;
  return {
    winner_user_id: last.winnerUserId,
    correct_answer: last.correctAnswer,
    explanation: session.currentQuestion?.explanation ?? null,
    scores: { player1: session.score.player1, player2: session.score.player2 },
    player_ids: { player1: session.player1.userId, player2: session.player2.userId },
    response_times: { player1_ms: last.player1TimeMs, player2_ms: last.player2TimeMs },
  };
}

function opponentForSlot(session: SessionState, slot: "player1" | "player2") {
  return slot === "player1" ? session.player2 : session.player1;
}

export async function syncActiveDuelOnConnect(socket: DuelSocket): Promise<void> {
  const userId = socket.data.authenticatedUserId;
  if (!userId) return;

  const session = findActiveSessionForUser(userId);
  if (!session || session.abandonInProgress) return;

  const slot = resolveDuelPlayerSlot(session, socket, userId);
  if (!slot) return;

  logInfo("[DUEL]", "reconnect:sync", { sessionId: session.sessionId, round: session.round, answered: session.answered });

  if (session.round === 0) {
    const opp = opponentForSlot(session, slot);
    socket.emit("match_found", { session_id: session.sessionId, opponent: { username: opp.username, avatar_url: opp.avatarUrl } });
    return;
  }

  if (session.answered) {
    const payload = roundResultPayload(session);
    if (payload) socket.emit("round_result", payload);
    return;
  }

  if (!session.currentQuestionId) return;
  const question = await prisma.duelQuestion
    .findUnique({ where: { id: session.currentQuestionId } })
    .catch(() => null);
  if (question) socket.emit("round_start", roundStartPayload(session, question));
}
