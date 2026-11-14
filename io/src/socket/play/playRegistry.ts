import { randomUUID } from "node:crypto";
import type { Namespace } from "socket.io";
import type { PlayMode, PlaySeat } from "@project/api-contract";
import type { Item, Track } from "@project/content-model";
import { prisma } from "@project/db";
import { LiveMatch, type LiveSeat } from "./liveMatch.js";
import { persistMatch } from "./persistMatch.js";

/** The one game each user is in (PRD 11.9: one active game per user). In memory on the io process. */
const matchByUser = new Map<string, LiveMatch>();

export function activeMatchOf(userId: string): LiveMatch | undefined {
  const match = matchByUser.get(userId);
  return match && !match.isFinished ? match : undefined;
}

/** What other players see of a user. */
export async function seatsFor(userIds: string[]): Promise<PlaySeat[]> {
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, avatarUrl: true, level: true } });
  return userIds.flatMap((userId) => {
    const user = users.find((candidate) => candidate.id === userId);
    return user ? [{ userId, username: user.username, avatarUrl: user.avatarUrl, level: user.level, isGhost: false }] : [];
  });
}

/** Starts a game for the seats and keeps it registered until it ends. */
export function startMatch(play: Namespace, mode: PlayMode, track: Track, seats: LiveSeat[], items: Item[], roomCode: string | null): LiveMatch {
  const match = new LiveMatch(randomUUID(), mode, track, seats, items, play, roomCode, async (result) => {
    for (const userId of match.userIds) if (matchByUser.get(userId) === match) matchByUser.delete(userId);
    return persistMatch(result);
  });
  for (const userId of match.userIds) matchByUser.set(userId, match);
  match.start();
  return match;
}
