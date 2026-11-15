import config from "config";
import { prisma, type ItemFormat, type ItemStatus } from "@project/db";
import type { Item, Track } from "@project/content-model";

/** Items a player saw in this many recent games are not picked again (PRD 11.9). */
const RECENT_GAMES = 20;

function servedStatuses(): ItemStatus[] {
  return config.get<boolean>("content.serveDrafts") ? ["LIVE", "DRAFT"] : ["LIVE"];
}

/** Items each of the given players met in their own last games: one busy player never crowds out another's history. */
async function recentItemIds(userIds: string[]): Promise<Set<string>> {
  const perPlayer = await Promise.all(
    userIds.map((userId) =>
      prisma.matchParticipant.findMany({ where: { userId }, orderBy: { match: { endedAt: "desc" } }, take: RECENT_GAMES, select: { match: { select: { itemIds: true } } } }),
    ),
  );
  return new Set(perPlayer.flat().flatMap((row) => row.match.itemIds));
}

/**
 * `count` duel-eligible items of the track in a random order, avoiding what the players saw lately;
 * only items of `format` when a game variant asks for one (PRD 11.10).
 */
export async function pickPlayItems(track: Track, count: number, userIds: string[], format: ItemFormat | null = null): Promise<Item[]> {
  const [rows, seen] = await Promise.all([
    prisma.item.findMany({ where: { track, duelEligible: true, status: { in: servedStatuses() }, ...(format ? { format } : {}) }, select: { id: true } }),
    recentItemIds(userIds),
  ]);
  const shuffled = (list: { id: string }[]) => list.map((row) => ({ id: row.id, order: Math.random() })).sort((left, right) => left.order - right.order);
  // Unseen items first; only when the pool runs short (a small bank, a very active player) do seen ones fill the rest.
  const chosen = [...shuffled(rows.filter((row) => !seen.has(row.id))), ...shuffled(rows.filter((row) => seen.has(row.id)))].slice(0, count);
  const items = await loadPlayItems(chosen.map((row) => row.id));
  return chosen.flatMap((row) => items.filter((item) => item.id === row.id));
}

/** Items by id, in no particular order. */
export async function loadPlayItems(itemIds: string[]): Promise<Item[]> {
  const rows = await prisma.item.findMany({ where: { id: { in: itemIds } }, select: { payload: true } });
  return rows.map((row) => row.payload as unknown as Item);
}
