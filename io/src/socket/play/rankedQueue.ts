import type { Namespace } from "socket.io";
import type { Track } from "@project/content-model";
import { prisma } from "@project/db";
import type { PlayError } from "@project/api-contract";
import { canMatch, GAME_MODES, GHOST_OFFER_AFTER_MS, LEAVE_WINDOW_MS, leaverCooldownMs } from "@project/match-engine";
import type { GhostScript } from "./liveMatch.js";
import { loadPlayItems, pickPlayItems } from "./playItems.js";
import { seatsFor, startMatch } from "./playRegistry.js";

type Waiting = { userId: string; track: Track; rating: number; joinedAt: number; pingMs: number };
const queue = new Map<string, Waiting>();
const TICK_MS = 1000;
const ROUNDS = GAME_MODES.ranked.rounds[0];

const blockedBetween = async (first: string, second: string) =>
  (await prisma.block.count({ where: { OR: [{ blockerId: first, blockedId: second }, { blockerId: second, blockedId: first }] } })) > 0;

/** Whether recent leaves of ranked games still keep this player out of the queue (PRD 11.8). */
async function inLeaverCooldown(userId: string): Promise<boolean> {
  const leaves = await prisma.matchParticipant.findMany({
    where: { userId, left: true, match: { mode: "RANKED", endedAt: { gte: new Date(Date.now() - LEAVE_WINDOW_MS) } } },
    orderBy: { match: { endedAt: "desc" } },
    select: { match: { select: { endedAt: true } } },
  });
  return leaves.length > 0 && leaves[0].match.endedAt.getTime() + leaverCooldownMs(leaves.length) > Date.now();
}

export async function joinRankedQueue(userId: string, track: Track, pingMs: number): Promise<PlayError | null> {
  if (await inLeaverCooldown(userId)) return "cooldown";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { rating: true } });
  queue.set(userId, { userId, track, rating: user?.rating ?? 1500, joinedAt: Date.now(), pingMs });
  return null;
}

export function leaveRankedQueue(userId: string): void {
  queue.delete(userId);
}

/**
 * Pairs waiting players of the same track inside each other's widening window, never across a
 * block (PRD 11.6); reports the wait to each player and offers a ghost after 25 seconds.
 */
export function startRankedMatchmaking(play: Namespace): NodeJS.Timeout {
  let busy = false;
  return setInterval(() => {
    if (busy) return;
    busy = true;
    void (async () => {
      const now = Date.now();
      const waiting = [...queue.values()].sort((left, right) => left.joinedAt - right.joinedAt);
      const paired = new Set<string>();
      for (const first of waiting) {
        if (paired.has(first.userId)) continue;
        for (const second of waiting) {
          if (second.userId === first.userId || paired.has(second.userId) || second.track !== first.track) continue;
          if (!canMatch({ rating: first.rating, waitedMs: now - first.joinedAt }, { rating: second.rating, waitedMs: now - second.joinedAt }, await blockedBetween(first.userId, second.userId))) continue;
          paired.add(first.userId).add(second.userId);
          queue.delete(first.userId);
          queue.delete(second.userId);
          const seats = await seatsFor([first.userId, second.userId]);
          const items = await pickPlayItems(first.track, ROUNDS, [first.userId, second.userId]);
          startMatch(play, { mode: "ranked", variant: "classic", track: first.track, roomCode: null }, seats.map((seat) => ({ ...seat, pingMs: seat.userId === first.userId ? first.pingMs : second.pingMs })), items);
          break;
        }
      }
      for (const entry of queue.values()) {
        const waitedMs = now - entry.joinedAt;
        play.to(`user:${entry.userId}`).emit("queue:status", { searching: true, waitedMs, ghostOffered: waitedMs >= GHOST_OFFER_AFTER_MS });
      }
    })().finally(() => {
      busy = false;
    });
  }, TICK_MS);
}

/**
 * A practice game against a recording of another player's real ranked game: the same items, that
 * player's answers and times; clearly labelled, unrated, participation XP only (PRD 11.6).
 * Returns false when no recording of the track exists yet.
 */
export async function startGhostMatch(play: Namespace, userId: string): Promise<boolean> {
  const waiting = queue.get(userId);
  if (!waiting) return false;
  const recording = await prisma.matchParticipant.findFirst({
    where: { userId: { not: userId }, isGhost: false, left: false, match: { mode: "RANKED", track: waiting.track } },
    orderBy: { match: { endedAt: "desc" } },
    select: { id: true, userId: true, answers: true, match: { select: { itemIds: true } } },
  });
  if (!recording?.userId) return false;
  queue.delete(userId);
  const [human] = await seatsFor([userId]);
  const [recorded] = await seatsFor([recording.userId]);
  const items = await loadPlayItems(recording.match.itemIds);
  const ordered = recording.match.itemIds.flatMap((itemId) => items.filter((item) => item.id === itemId));
  const ghost: GhostScript = { participantId: recording.id, answers: recording.answers as GhostScript["answers"] };
  startMatch(play, { mode: "ghost", variant: "classic", track: waiting.track, roomCode: null }, [
    { ...human, pingMs: waiting.pingMs },
    { ...recorded, userId: `ghost:${recording.id}`, isGhost: true, pingMs: 0, ghost },
  ], ordered);
  return true;
}
