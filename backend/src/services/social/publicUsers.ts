import { prisma, type Prisma } from "@project/db";
import type { PublicUser, Relationship } from "@project/api-contract";
import { PLACEMENT_GAMES } from "@project/match-engine";

/**
 * The only way another user leaves the server (PRD 15.7): every social route builds its users
 * here, so blocks and privacy are applied in one place. A block in either direction hides a user
 * completely. A profile the viewer may not see keeps only the username and avatar: a "friends
 * only" profile everywhere, a "nobody" profile only where a friendship or a request links the two.
 */

export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  avatarUrl: true,
  level: true,
  rating: true,
  ratedGamesPlayed: true,
  bio: true,
  githubLogin: true,
  profileVisibility: true,
} satisfies Prisma.UserSelect;

export type PublicUserRow = Prisma.UserGetPayload<{ select: typeof PUBLIC_USER_SELECT }>;

/** Where the users are shown: a search or a profile needs a visible profile; a relationship list does not. */
export type Listing = "discovery" | "relationships";

/** Users blocked by the viewer or blocking the viewer, among `otherIds`. */
async function blockedIds(viewerId: string, otherIds: string[]): Promise<Set<string>> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId, blockedId: { in: otherIds } }, { blockedId: viewerId, blockerId: { in: otherIds } }] },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(blocks.map((block) => (block.blockerId === viewerId ? block.blockedId : block.blockerId)));
}

/** How the viewer relates to each of `otherIds`. */
async function relationshipsOf(viewerId: string, otherIds: string[]): Promise<Map<string, Relationship>> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [{ requesterId: viewerId, addresseeId: { in: otherIds } }, { addresseeId: viewerId, requesterId: { in: otherIds } }],
    },
    select: { requesterId: true, addresseeId: true, status: true },
  });
  return new Map(
    rows.map((row): [string, Relationship] => {
      const other = row.requesterId === viewerId ? row.addresseeId : row.requesterId;
      if (row.status === "ACCEPTED") return [other, "friend"];
      return [other, row.requesterId === viewerId ? "requestSent" : "requestReceived"];
    }),
  );
}

function canSeeProfile(row: PublicUserRow, relationship: Relationship): boolean {
  return row.profileVisibility === "EVERYONE" || (row.profileVisibility === "FRIENDS" && relationship === "friend");
}

/** The users the viewer may see, in the given order, as `PublicUser`s. The viewer is never in the result. */
export async function publicUsersFor(viewerId: string, rows: readonly PublicUserRow[], listing: Listing): Promise<PublicUser[]> {
  const others = rows.filter((row) => row.id !== viewerId);
  const ids = others.map((row) => row.id);
  const [blocked, relationships] = await Promise.all([blockedIds(viewerId, ids), relationshipsOf(viewerId, ids)]);
  return others.flatMap((row): PublicUser[] => {
    if (blocked.has(row.id)) return [];
    const relationship = relationships.get(row.id) ?? "none";
    const visible = canSeeProfile(row, relationship);
    // A "friends only" profile still shows a stranger its username and avatar (PRD 11.2); "nobody" shows nothing.
    if (!visible && listing === "discovery" && row.profileVisibility === "NOBODY") return [];
    return [
      {
        id: row.id,
        username: row.username,
        avatarUrl: row.avatarUrl,
        level: visible ? row.level : null,
        rating: visible && row.ratedGamesPlayed >= PLACEMENT_GAMES ? Math.round(row.rating) : null,
        bio: visible ? row.bio : null,
        githubLogin: visible ? row.githubLogin : null,
        relationship,
      },
    ];
  });
}

/** Whether either user has blocked the other. */
export async function isBlockedEitherWay(firstId: string, secondId: string): Promise<boolean> {
  return (await blockedIds(firstId, [secondId])).size > 0;
}
