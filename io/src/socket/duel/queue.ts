import type { Socket } from "socket.io";
import { logInfo } from "../../utils/logger.js";
import { broadcastQueueStatus, evictUserFromQueue, makeSession, queue, sessions, soloMatchTimers, userInActiveDuel } from "./state.js";
import { scheduleReadyTimeout } from "./roundTimeout.js";
import type { DuelNamespace, QueueEntry } from "./types.js";

/** Wait this long with no opponent before matching the player into a solo duel (real server session). */
const SOLO_MATCH_WAIT_MS = 25_000;

const SOLO_SOCKET_PREFIX = "solo:";

export function clearSoloMatchTimer(socketId: string): void {
  const t = soloMatchTimers.get(socketId);
  if (t) clearTimeout(t);
  soloMatchTimers.delete(socketId);
}

function scheduleSoloMatchIfAlone(duel: DuelNamespace, socketId: string): void {
  clearSoloMatchTimer(socketId);
  soloMatchTimers.set(
    socketId,
    setTimeout(() => {
      soloMatchTimers.delete(socketId);
      tryBeginSoloDuel(duel, socketId);
    }, SOLO_MATCH_WAIT_MS),
  );
}

function tryBeginSoloDuel(duel: DuelNamespace, socketId: string): void {
  const idx = queue.findIndex((e) => e.socketId === socketId);
  if (idx === -1) return;
  const sole = queue.splice(idx, 1)[0];
  const synthetic: QueueEntry = { ...sole, socketId: `${SOLO_SOCKET_PREFIX}${sole.socketId}` };
  finalizeMatch(duel, sole, synthetic);
}

export function finalizeMatch(duel: DuelNamespace, player1: QueueEntry, player2: QueueEntry): void {
  const sessionId = `sess_${crypto.randomUUID()}`;
  const roomId = `duel_${sessionId}`;
  const p1Socket = duel.sockets.get(player1.socketId);
  const p2Socket = duel.sockets.get(player2.socketId);
  void p1Socket?.join(roomId);
  void p2Socket?.join(roomId);

  const session = makeSession(sessionId, roomId, player1, player2);
  sessions.set(sessionId, session);
  scheduleReadyTimeout(duel, session);
  logInfo("[DUEL]", "match:created", { sessionId, player1: player1.userId, player2: player2.userId });

  duel.to(player1.socketId).emit("match_found", { session_id: sessionId, opponent: { username: player2.username, avatar_url: player2.avatarUrl } });
  if (p2Socket) duel.to(player2.socketId).emit("match_found", { session_id: sessionId, opponent: { username: player1.username, avatar_url: player1.avatarUrl } });
}

export function handleQueueJoin(socket: Socket, duel: DuelNamespace, entry: QueueEntry): void {
  logInfo("[DUEL]", "queue:join", { userId: entry.userId, socketId: socket.id });
  if (userInActiveDuel(entry.userId)) {
    socket.emit("queue_rejected", { reason: "already_in_duel" });
    return;
  }
  if (queue.some((candidate) => candidate.socketId === entry.socketId)) return;
  evictUserFromQueue(duel, entry.userId, clearSoloMatchTimer);
  const opponentIndex = queue.findIndex((c) => c.userId !== entry.userId && c.socketId !== entry.socketId);
  if (opponentIndex === -1) {
    queue.push(entry);
    scheduleSoloMatchIfAlone(duel, entry.socketId);
  } else {
    const opponent = queue.splice(opponentIndex, 1)[0];
    clearSoloMatchTimer(opponent.socketId);
    clearSoloMatchTimer(entry.socketId);
    finalizeMatch(duel, opponent, entry);
  }
  broadcastQueueStatus(duel);
}
