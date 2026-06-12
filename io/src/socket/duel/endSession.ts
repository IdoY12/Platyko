/** Finalizes a duel: writes DB, emits duel_end, clears session, registers rematch entry. */

import { persistDuelSession } from "./persistence.js";
import { prisma, getProgressForActiveUser } from "@project/db";
import { clearSessionRoundTimer } from "./roundTimeout.js";
import { sessions, rematchEntries } from "./state.js";
import type { DuelNamespace, SessionState } from "./types.js";

const REMATCH_EXPIRY_MS = 60_000;

export async function endSession(io: DuelNamespace, session: SessionState) {
  if (session.abandonInProgress) return;
  clearSessionRoundTimer(session);
  // Remove from the map before any await so a concurrent disconnect cannot
  // run the abandon flow and persist this duel a second time.
  sessions.delete(session.sessionId);
  const isTied = session.score.player1 === session.score.player2;
  const winner = session.score.player1 >= session.score.player2 ? session.player1 : session.player2;

  await persistDuelSession(session);

  const isSolo = session.player1.userId === session.player2.userId;
  rematchEntries.set(session.sessionId, {
    player1: session.player1,
    player2: session.player2,
    isSolo,
    requests: new Map(),
    io,
    timer: setTimeout(() => {
      const entry = rematchEntries.get(session.sessionId);
      if (entry) entry.requests.forEach((socketId) => entry.io.to(socketId).emit("rematch_declined", { reason: "timeout" }));
      rematchEntries.delete(session.sessionId);
    }, REMATCH_EXPIRY_MS),
  });

  const [streakP1, streakP2] = await Promise.all([
    getProgressForActiveUser(prisma, session.player1.userId).then((p) => p?.streakCurrent ?? 0),
    isSolo
      ? Promise.resolve(0)
      : getProgressForActiveUser(prisma, session.player2.userId).then((p) => p?.streakCurrent ?? 0),
  ]);
  const streakP2Out = isSolo ? streakP1 : streakP2;

  const base = {
    winner_user_id: isTied ? null : winner.userId,
    round_replay: session.roundReplay,
    ...(isTied ? { tied: true } : {}),
  };
  const payloadP1 = {
    ...base,
    my_score: session.score.player1,
    opp_score: session.score.player2,
    xp_earned: session.xpGrantedP1,
    streak_current: streakP1,
  };
  if (isSolo) {
    io.to(session.roomId).emit("duel_end", payloadP1);
    return;
  }

  io.to(session.player1.socketId).emit("duel_end", payloadP1);
  io.to(session.player2.socketId).emit("duel_end", {
    ...base,
    my_score: session.score.player2,
    opp_score: session.score.player1,
    xp_earned: session.xpGrantedP2,
    streak_current: streakP2Out,
  });
}
