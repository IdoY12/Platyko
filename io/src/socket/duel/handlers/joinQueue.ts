/**
 * Registers `join_queue` after verifying JWT-backed user context on the socket.
 *
 * Responsibility: load profile snapshot and enqueue for matchmaking.
 * Layer: io duel handlers
 * Depends on: Prisma, queue handleQueueJoin
 * Consumers: duel/index.ts
 */

import type { Socket } from "socket.io";
import { activeExperienceLevelOf, prisma } from "@project/db";
import { logInfo } from "../../../utils/logger.js";
import { handleQueueJoin } from "../queue.js";
import { isThrottled } from "../../../utils/socketThrottle.js";
import type { DuelNamespace, QueueEntry } from "../types.js";

export function registerJoinQueue(socket: Socket, duel: DuelNamespace) {
  socket.on("join_queue", async (payload: { username?: unknown } | undefined) => {
    if (isThrottled(socket, "join_queue", 2000)) return;
    const authenticatedUserId = socket.data.authenticatedUserId;

    if (!authenticatedUserId) {
      socket.emit("queue_rejected", { reason: "authentication_required" });
      logInfo("[DUEL]", "queue:rejected-unauthenticated", { socketId: socket.id });
      return;
    }

    const level = await activeExperienceLevelOf(prisma, authenticatedUserId);
    const [user, progress] = await Promise.all([
      prisma.user.findUnique({ where: { id: authenticatedUserId } }).catch(() => null),
      prisma.userProgress
        .findUnique({ where: { userId_experienceLevel: { userId: authenticatedUserId, experienceLevel: level } } })
        .catch(() => null),
    ]);
    const entry: QueueEntry = {
      socketId: socket.id,
      userId: authenticatedUserId,
      username: user?.username ?? (typeof payload?.username === "string" ? payload.username : "Anonymous"),
      avatarUrl: user?.avatarUrl ?? null,
      experienceLevel: progress?.experienceLevel ?? level,
      joinedAt: Date.now(),
    };
    handleQueueJoin(socket, duel, entry);
  });
}
