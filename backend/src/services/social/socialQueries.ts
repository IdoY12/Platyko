import { RECENT_GAMES_FOR_OPPONENTS, SEARCH_MAX_RESULTS, type FriendRequest, type FriendsResponse, type PublicUser } from "@project/api-contract";
import { prisma } from "@project/db";
import { friendStreaksFor } from "./friendStreaks.js";
import { PUBLIC_USER_SELECT, publicUsersFor } from "./publicUsers.js";

/** Users whose username starts with `query`, who appear in search and whose profile the viewer may see. */
export async function searchUsers(viewerId: string, query: string): Promise<PublicUser[]> {
  const rows = await prisma.user.findMany({
    where: { usernameLower: { startsWith: query.toLowerCase() }, searchable: true, id: { not: viewerId } },
    orderBy: { usernameLower: "asc" },
    // Some candidates may be hidden by a block or privacy; read a few more than are shown.
    take: SEARCH_MAX_RESULTS * 2,
    select: PUBLIC_USER_SELECT,
  });
  return (await publicUsersFor(viewerId, rows, "discovery")).slice(0, SEARCH_MAX_RESULTS);
}

/** People the viewer played in their last games, most recent first, never a ghost or the viewer. */
export async function recentOpponentsOf(viewerId: string): Promise<PublicUser[]> {
  const games = await prisma.match.findMany({
    where: { participants: { some: { userId: viewerId, isGhost: false } } },
    orderBy: { endedAt: "desc" },
    take: RECENT_GAMES_FOR_OPPONENTS,
    select: { participants: { where: { isGhost: false, userId: { not: viewerId } }, select: { user: { select: PUBLIC_USER_SELECT } } } },
  });
  const opponents = new Map(games.flatMap((game) => game.participants.flatMap((seat) => (seat.user ? [[seat.user.id, seat.user] as const] : []))));
  return publicUsersFor(viewerId, [...opponents.values()], "discovery");
}

/** One user's profile, or null when it does not exist or is hidden from the viewer. */
export async function profileOf(viewerId: string, username: string): Promise<PublicUser | null> {
  const row = await prisma.user.findUnique({ where: { usernameLower: username.toLowerCase() }, select: PUBLIC_USER_SELECT });
  return row ? ((await publicUsersFor(viewerId, [row], "discovery"))[0] ?? null) : null;
}

/** The viewer's friends, the requests waiting on either side, the viewer's friend code and their Friend Streaks. */
export async function friendsOf(viewerId: string, today: string): Promise<FriendsResponse> {
  const [viewer, links] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: viewerId }, select: { friendCode: true } }),
    prisma.friendship.findMany({
      where: { status: { in: ["PENDING", "ACCEPTED"] }, OR: [{ requesterId: viewerId }, { addresseeId: viewerId }] },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: PUBLIC_USER_SELECT }, addressee: { select: PUBLIC_USER_SELECT } },
    }),
  ]);
  const others = links.map((link) => (link.requesterId === viewerId ? link.addressee : link.requester));
  const visible = new Map((await publicUsersFor(viewerId, others, "relationships")).map((user) => [user.id, user]));
  const requests = (incoming: boolean): FriendRequest[] =>
    links.flatMap((link) => {
      const user = visible.get(incoming ? link.requesterId : link.addresseeId);
      const matches = link.status === "PENDING" && (incoming ? link.addresseeId : link.requesterId) === viewerId;
      return matches && user ? [{ id: link.id, user, createdAt: link.createdAt.toISOString() }] : [];
    });
  const streakFriendIds = links.filter((link) => link.status === "ACCEPTED" && link.streakEnabled).map((link) => (link.requesterId === viewerId ? link.addresseeId : link.requesterId));
  return {
    streaks: await friendStreaksFor(viewerId, streakFriendIds, today),
    friends: [...visible.values()].filter((user) => user.relationship === "friend").sort((left, right) => left.username.localeCompare(right.username)),
    incoming: requests(true),
    outgoing: requests(false),
    friendCode: viewer.friendCode,
  };
}
