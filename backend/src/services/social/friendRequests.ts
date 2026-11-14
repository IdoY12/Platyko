import { DECLINE_COOLDOWN_DAYS, MAX_FRIENDS, MAX_OUTGOING_REQUESTS, SOCIAL_ERRORS, type SendFriendRequest } from "@project/api-contract";
import { prisma } from "@project/db";
import { isBlockedEitherWay } from "./publicUsers.js";

/** The outcome of a social action: done, or one of the shared error replies. */
export type SocialResult<Value = undefined> = { ok: true; value: Value } | { ok: false; error: (typeof SOCIAL_ERRORS)[keyof typeof SOCIAL_ERRORS]; status: number };

const failure = (error: (typeof SOCIAL_ERRORS)[keyof typeof SOCIAL_ERRORS], status: number): SocialResult<never> => ({ ok: false, error, status });
const DAY_MS = 24 * 60 * 60 * 1000;

const countFriends = (userId: string) => prisma.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } });

/**
 * Sends a friend request (PRD 11.1). A request to someone who already asked the sender accepts
 * theirs; a request inside the cooldown after a decline is answered as sent but not delivered,
 * so the sender never learns of the decline.
 */
export async function sendFriendRequest(senderId: string, target: SendFriendRequest): Promise<SocialResult<"sent" | "accepted">> {
  const addressee = target.friendCode
    ? await prisma.user.findUnique({ where: { friendCode: target.friendCode.toUpperCase() }, select: { id: true, friendRequestPolicy: true } })
    : await prisma.user.findUnique({ where: { usernameLower: (target.username ?? "").toLowerCase() }, select: { id: true, friendRequestPolicy: true } });
  if (!addressee || (await isBlockedEitherWay(senderId, addressee.id))) return failure(SOCIAL_ERRORS.userNotFound, 404);
  if (addressee.id === senderId) return failure(SOCIAL_ERRORS.cannotAddSelf, 400);
  if (!target.friendCode && addressee.friendRequestPolicy === "CODE_ONLY") return failure(SOCIAL_ERRORS.codeOnly, 403);

  const existing = await prisma.friendship.findMany({ where: { OR: [{ requesterId: senderId, addresseeId: addressee.id }, { requesterId: addressee.id, addresseeId: senderId }] } });
  if (existing.some((row) => row.status === "ACCEPTED")) return failure(SOCIAL_ERRORS.alreadyFriends, 409);
  const theirs = existing.find((row) => row.requesterId === addressee.id && row.status === "PENDING");
  if (theirs) return acceptRequest(senderId, theirs.id).then((result) => (result.ok ? { ok: true as const, value: "accepted" as const } : result));
  const mine = existing.find((row) => row.requesterId === senderId);
  if (mine?.status === "PENDING") return { ok: true, value: "sent" };
  if (mine?.status === "DECLINED" && mine.respondedAt && Date.now() - mine.respondedAt.getTime() < DECLINE_COOLDOWN_DAYS * DAY_MS) return { ok: true, value: "sent" };

  const [outgoing, senderFriends, addresseeFriends] = await Promise.all([
    prisma.friendship.count({ where: { requesterId: senderId, status: "PENDING" } }),
    countFriends(senderId),
    countFriends(addressee.id),
  ]);
  if (outgoing >= MAX_OUTGOING_REQUESTS) return failure(SOCIAL_ERRORS.tooManyRequests, 429);
  if (senderFriends >= MAX_FRIENDS || addresseeFriends >= MAX_FRIENDS) return failure(SOCIAL_ERRORS.friendLimit, 409);
  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: senderId, addresseeId: addressee.id } },
    create: { requesterId: senderId, addresseeId: addressee.id, status: "PENDING" },
    update: { status: "PENDING", createdAt: new Date(), respondedAt: null },
  });
  return { ok: true, value: "sent" };
}

/** Accepts a request addressed to the user. */
export async function acceptRequest(userId: string, requestId: string): Promise<SocialResult> {
  const request = await prisma.friendship.findFirst({ where: { id: requestId, addresseeId: userId, status: "PENDING" } });
  if (!request) return failure(SOCIAL_ERRORS.requestNotFound, 404);
  if ((await countFriends(userId)) >= MAX_FRIENDS || (await countFriends(request.requesterId)) >= MAX_FRIENDS) return failure(SOCIAL_ERRORS.friendLimit, 409);
  await prisma.friendship.update({ where: { id: requestId }, data: { status: "ACCEPTED", respondedAt: new Date() } });
  return { ok: true, value: undefined };
}

/** Declines a request addressed to the user; the sender is not told. */
export async function declineRequest(userId: string, requestId: string): Promise<SocialResult> {
  const { count } = await prisma.friendship.updateMany({ where: { id: requestId, addresseeId: userId, status: "PENDING" }, data: { status: "DECLINED", respondedAt: new Date() } });
  return count === 1 ? { ok: true, value: undefined } : failure(SOCIAL_ERRORS.requestNotFound, 404);
}

/** Withdraws a request the user sent. */
export async function cancelRequest(userId: string, requestId: string): Promise<SocialResult> {
  const { count } = await prisma.friendship.deleteMany({ where: { id: requestId, requesterId: userId, status: "PENDING" } });
  return count === 1 ? { ok: true, value: undefined } : failure(SOCIAL_ERRORS.requestNotFound, 404);
}

/** Ends a friendship from either side. */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await prisma.friendship.deleteMany({ where: { status: "ACCEPTED", OR: [{ requesterId: userId, addresseeId: friendId }, { requesterId: friendId, addresseeId: userId }] } });
}
