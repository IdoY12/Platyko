import config from "config";
import { prisma, type ItemStatus } from "@project/db";
import type { Item, Track } from "@project/content-model";

/** Items a player saw in this many recent games are not picked again (PRD 11.9). */
const RECENT_GAMES = 20;

function servedStatuses(): ItemStatus[] {
  return config.get<boolean>("content.serveDrafts") ? ["LIVE", "DRAFT"] : ["LIVE"];
}

/** Items the given players met in their last games. */
async function recentItemIds(userIds: string[]): Promise<Set<string>> {
  const recent = await prisma.matchParticipant.findMany({
    where: { userId: { in: userIds } },
    orderBy: { match: { endedAt: "desc" } },
    take: RECENT_GAMES * userIds.length,
    select: { match: { select: { itemIds: true } } },
  });
  return new Set(recent.flatMap((row) => row.match.itemIds));
}

/** `count` duel-eligible items of the track in a random order, avoiding what the players saw lately. */
export async function pickPlayItems(track: Track, count: number, userIds: string[]): Promise<Item[]> {
  const [rows, seen] = await Promise.all([
    prisma.item.findMany({ where: { track, duelEligible: true, status: { in: servedStatuses() } }, select: { id: true } }),
    recentItemIds(userIds),
  ]);
  const fresh = rows.filter((row) => !seen.has(row.id));
  // A small bank or a very active player may run out of unseen items: fall back to any of them.
  const pool = fresh.length >= count ? fresh : rows;
  const chosen = pool.map((row) => ({ id: row.id, order: Math.random() })).sort((left, right) => left.order - right.order).slice(0, count);
  const items = await loadPlayItems(chosen.map((row) => row.id));
  return chosen.flatMap((row) => items.filter((item) => item.id === row.id));
}

/** Items by id, in no particular order. */
export async function loadPlayItems(itemIds: string[]): Promise<Item[]> {
  const rows = await prisma.item.findMany({ where: { id: { in: itemIds } }, select: { payload: true } });
  return rows.map((row) => row.payload as unknown as Item);
}
