import { prisma } from "@project/db";
import { logError } from "../../utils/logger.js";
import type { SessionState } from "./types.js";

/** Writes the finished duel. A match that never reached round 1 (ready timeout) leaves no row. */
export async function persistDuelSession(session: SessionState, winnerId?: string | null): Promise<void> {
  if (session.round === 0) return;
  const isTied = session.score.player1 === session.score.player2;
  const defaultWinnerId = isTied
    ? null
    : session.score.player1 >= session.score.player2
    ? session.player1.userId
    : session.player2.userId;
  await prisma.duelSession
    .create({
      data: {
        player1Id: session.player1.userId,
        player2Id: session.player2.userId,
        winnerId: winnerId !== undefined ? winnerId : defaultWinnerId,
        player1Score: session.score.player1,
        player2Score: session.score.player2,
        roundsPlayed: session.round,
        roundReplay: session.roundReplay,
        endedAt: new Date(),
      },
    })
    .catch((err) => logError("[DUEL]", err, { type: "duelSession.create" }));
}
