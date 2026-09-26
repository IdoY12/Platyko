/**
 * Registers `join_queue` after verifying JWT-backed user context on the socket.
 *
 * Responsibility: load the profile snapshot from the DB (never from the client) and enqueue for matchmaking.
 * Layer: io duel handlers
 * Depends on: Prisma, queue handleQueueJoin
 * Consumers: duel/index.ts
 */

import { prisma } from "@project/db";
import { logInfo } from "../../../utils/logger.js";
import { handleQueueJoin } from "../queue.js";
import { isThrottled } from "../../../utils/socketThrottle.js";
import type { DuelNamespace, DuelSocket, QueueEntry } from "../types.js";

export function registerJoinQueue(socket: DuelSocket, duel: DuelNamespace) {
  socket.on("join_queue", async () => {
    if (isThrottled(socket, "join_queue", 2000)) return;
    const authenticatedUserId = socket.data.authenticatedUserId;

    if (!authenticatedUserId) {
      socket.emit("queue_rejected", { reason: "authentication_required" });
      logInfo("[DUEL]", "queue:rejected-unauthenticated", { socketId: socket.id });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: authenticatedUserId } }).catch(() => null);
    const entry: QueueEntry = {
      socketId: socket.id,
      userId: authenticatedUserId,
      username: user?.username ?? "Anonymous",
      avatarUrl: user?.avatarUrl ?? null,
      joinedAt: Date.now(),
    };
    handleQueueJoin(socket, duel, entry);
  });
}
