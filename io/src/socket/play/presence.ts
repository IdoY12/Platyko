import type { Namespace } from "socket.io";
import type { PresenceEvent, PresenceStatus } from "@project/api-contract";
import { prisma } from "@project/db";
import type { AuthenticatedSocket } from "../authenticateSocket.js";
import { activeMatchOf } from "./playRegistry.js";
import { roomOf } from "./privateRooms.js";

/** How often connected players' presence is re-read; a change goes out within this time. */
const SWEEP_MS = 3000;

/** The status each user's friends last heard; a user absent here was last announced offline. */
const announced = new Map<string, PresenceStatus>();

export function isOnline(play: Namespace, userId: string): boolean {
  return (play.adapter.rooms.get(`user:${userId}`)?.size ?? 0) > 0;
}

/** "In a game" covers a running game and a lobby (PRD 11.3). */
function statusOf(play: Namespace, userId: string): PresenceStatus {
  if (!isOnline(play, userId)) return "offline";
  return activeMatchOf(userId) || roomOf(userId) ? "in-game" : "online";
}

/** Accepted friends of a user. */
async function friendIdsOf(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
}

/** Tells a user's friends their new status, unless they hide it ("show online status: to nobody"). */
async function announce(play: Namespace, userId: string, status: PresenceStatus): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { presenceVisibility: true } });
  if (user?.presenceVisibility !== "FRIENDS") return;
  const event: PresenceEvent = { userId, status };
  for (const friendId of await friendIdsOf(userId)) play.to(`user:${friendId}`).emit("presence:update", event);
}

/** The online friends of a user who share their status, sent once when the user connects. */
export async function presenceSnapshotFor(play: Namespace, userId: string): Promise<PresenceEvent[]> {
  const friendIds = await friendIdsOf(userId);
  const sharing = await prisma.user.findMany({ where: { id: { in: friendIds }, presenceVisibility: "FRIENDS" }, select: { id: true } });
  return sharing.map((friend) => ({ userId: friend.id, status: statusOf(play, friend.id) })).filter((event) => event.status !== "offline");
}

/** Re-reads every connected or recently announced user and announces only what changed. */
export function startPresenceSweep(play: Namespace): void {
  setInterval(() => {
    const connected = new Set([...play.sockets.values()].map((socket) => (socket as AuthenticatedSocket).data.authenticatedUserId).filter((id): id is string => Boolean(id)));
    for (const userId of new Set([...connected, ...announced.keys()])) {
      const status = statusOf(play, userId);
      if ((announced.get(userId) ?? "offline") === status) continue;
      if (status === "offline") announced.delete(userId);
      else announced.set(userId, status);
      void announce(play, userId, status);
    }
  }, SWEEP_MS).unref();
}
