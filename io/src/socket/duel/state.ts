import type { DuelNamespace, QueueEntry, SessionState } from "./types.js";

function countAuthenticatedDuelUsers(duel: DuelNamespace, excludeSocketId?: string): number {
  const seen = new Set<string>();
  duel.sockets.forEach((sock, sid) => {
    if (excludeSocketId !== undefined && sid === excludeSocketId) return;
    const uid = sock.data.authenticatedUserId;
    if (typeof uid === "string" && uid.length > 0) seen.add(uid);
  });
  return seen.size;
}

export function broadcastQueueStatus(duel: DuelNamespace, excludeSocketId?: string): void {
  duel.emit("queue_status", { players_online: countAuthenticatedDuelUsers(duel, excludeSocketId) });
}

export const queue: QueueEntry[] = [];

export const sessions = new Map<string, SessionState>();

export function findActiveSessionForUser(userId: string): SessionState | undefined {
  return Array.from(sessions.values()).find(
    (session) => session.player1.userId === userId || session.player2.userId === userId,
  );
}

export function userInActiveDuel(userId: string): boolean {
  return findActiveSessionForUser(userId) !== undefined;
}

export function evictUserFromQueue(duel: DuelNamespace, userId: string, onEvict: (socketId: string) => void): void {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].userId !== userId) continue;
    const socketId = queue[i].socketId;
    onEvict(socketId);
    queue.splice(i, 1);
    duel.to(socketId).emit("queue_rejected", { reason: "superseded_by_other_device" });
  }
}

/** Atomically marks the current round resolved; returns false if already claimed. */
export function tryClaimDuelRound(session: SessionState): boolean {
  if (session.answered) return false;
  session.answered = true;
  return true;
}

export function makeSession(sessionId: string, roomId: string, p1: QueueEntry, p2: QueueEntry): SessionState {
  return {
    sessionId, roomId, player1: p1, player2: p2,
    score: { player1: 0, player2: 0 }, round: 0,
    readyUserIds: new Set<string>(),
    currentQuestionId: null, currentQuestion: null, answered: false,
    player1Attempts: 0, player2Attempts: 0, roundReplay: [],
    player1StreakLocalDate: null, player2StreakLocalDate: null,
    xpGrantedP1: 0, xpGrantedP2: 0, askedQuestionIds: new Set<string>(),
  };
}

/** When still alone after {@link SOLO_MATCH_WAIT_MS}, start a solo session (see queue.ts). */
export const soloMatchTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface RematchEntry {
  player1: QueueEntry;
  player2: QueueEntry;
  isSolo: boolean;
  /** userId → current socketId of the requesting player. */
  requests: Map<string, string>;
  timer: ReturnType<typeof setTimeout> | null;
  io: DuelNamespace;
}

/** Keyed by the original sessionId. Expires after REMATCH_EXPIRY_MS. */
export const rematchEntries = new Map<string, RematchEntry>();
