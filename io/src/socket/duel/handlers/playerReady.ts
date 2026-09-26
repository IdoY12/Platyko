/**
 * Registers `player_ready` so only matched session sockets can start rounds.
 *
 * Responsibility: gate ready state on verified duel participant socket ids.
 * Layer: io duel handlers
 * Depends on: session state, resolveDuelPlayerSlot, startRound, payload guards
 * Consumers: duel/index.ts
 */

import { logError, logInfo } from "../../../utils/logger.js";
import { resolveDuelPlayerSlot } from "../resolveDuelPlayerSlot.js";
import { isThrottled } from "../../../utils/socketThrottle.js";
import { readStreakLocalDate, sessionIdOf } from "../payloadGuards.js";
import { sessions } from "../state.js";
import { startRound } from "../startRound.js";
import type { DuelNamespace, DuelSocket } from "../types.js";

export function registerPlayerReady(socket: DuelSocket, duel: DuelNamespace) {
  socket.on("player_ready", async (payload: unknown) => {
    try {
      if (!socket.data.authenticatedUserId) {
        socket.emit("auth_error", { message: "Authentication required" });
        return;
      }
      if (isThrottled(socket, "player_ready", 1000)) return;
      const sessionId = sessionIdOf(payload);
      if (!sessionId) return;
      const session = sessions.get(sessionId);
      if (!session) return;

      const slot = resolveDuelPlayerSlot(session, socket, socket.data.authenticatedUserId);
      if (!slot) {
        logInfo("[DUEL]", "player_ready:rejected-non-participant", { socketId: socket.id });
        return;
      }

      const userId = slot === "player1" ? session.player1.userId : session.player2.userId;
      const streakDate = readStreakLocalDate(payload);
      if (slot === "player1") session.player1StreakLocalDate = streakDate;
      else session.player2StreakLocalDate = streakDate;
      session.readyUserIds.add(userId);

      const sameHumanSolo = session.player1.userId === session.player2.userId;
      const readyEnough = sameHumanSolo ? session.readyUserIds.size >= 1 : session.readyUserIds.size >= 2;

      if (readyEnough && session.round === 0) {
        await startRound(duel, session);
      }
    } catch (error) {
      logError("[DUEL]", error, { phase: "player_ready" });
    }
  });
}
