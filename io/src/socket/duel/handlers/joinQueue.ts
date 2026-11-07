/**
 * Registers `join_queue` after verifying JWT-backed user context on the socket.
 *
 * Responsibility: load the profile snapshot from the DB (never from the client) and enqueue for matchmaking.
 * Layer: io duel handlers
 * Depends on: Prisma, queue handleQueueJoin
 * Consumers: duel/index.ts
 */

import { prisma } from "@project/db";
import { logError } from "../../../utils/logger.js";
import { handleQueueJoin } from "../queue.js";
import { isThrottled } from "../../../utils/socketThrottle.js";
import type { DuelNamespace, DuelSocket, QueueEntry } from "../types.js";

export function registerJoinQueue(socket: DuelSocket, duel: DuelNamespace) {
  socket.on("join_queue", async () => {
    if (isThrottled(socket, "join_queue", 2000)) return;
    const authenticatedUserId = socket.data.authenticatedUserId;

    const user = await prisma.user.findUnique({ where: { id: authenticatedUserId } }).catch(() => null);
    if (!user) return; // deleted account, or DB down: never queue an "Anonymous" player
    const entry: QueueEntry = {
      socketId: socket.id,
      userId: authenticatedUserId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      joinedAt: Date.now(),
    };
    try { handleQueueJoin(socket, duel, entry); } catch (error) { logError("[DUEL]", error, { phase: "join_queue" }); }
  });
}
