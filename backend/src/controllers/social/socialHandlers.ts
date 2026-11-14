import type { Response } from "express";
import type { FriendStreakRequest, PrivacySettings, ReportRequest, SendFriendRequest } from "@project/api-contract";
import { SOCIAL_ERRORS } from "@project/api-contract";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { blockedUsers, blockUser, reportUser, unblockUser } from "../../services/social/blocksAndReports.js";
import { acceptRequest, cancelRequest, declineRequest, removeFriend, sendFriendRequest, type SocialResult } from "../../services/social/friendRequests.js";
import { setFriendStreak } from "../../services/social/friendStreaks.js";
import { friendsOf, profileOf, recentOpponentsOf, searchUsers } from "../../services/social/socialQueries.js";

const PRIVACY_SELECT = { profileVisibility: true, friendRequestPolicy: true, searchable: true, presenceVisibility: true, gameInvitePolicy: true } as const;

const viewer = (request: AuthenticatedRequest) => request.user!.userId;
const param = (request: AuthenticatedRequest, name: string) => (request.validatedParams as Record<string, string>)[name];

/** Sends a social result: the shared error reply, a JSON body, or 204 when there is nothing to say. */
function reply<Value>(response: Response, result: SocialResult<Value>, body: (value: Value) => unknown = () => undefined): void {
  if (!result.ok) {
    response.status(result.status).json({ error: result.error });
    return;
  }
  const payload = body(result.value);
  if (payload === undefined) response.status(204).send();
  else response.json(payload);
}

export async function getSearch(request: AuthenticatedRequest, response: Response) {
  response.json({ users: await searchUsers(viewer(request), (request.validatedQuery as { q: string }).q) });
}

export async function getRecentOpponents(request: AuthenticatedRequest, response: Response) {
  response.json({ users: await recentOpponentsOf(viewer(request)) });
}

export async function getUserProfile(request: AuthenticatedRequest, response: Response) {
  const profile = await profileOf(viewer(request), param(request, "username"));
  if (profile) response.json(profile);
  else response.status(404).json({ error: SOCIAL_ERRORS.userNotFound });
}

/** `?localDate=` is the learner's calendar day, which a Friend Streak counts by; the server's UTC day otherwise. */
export async function getFriends(request: AuthenticatedRequest, response: Response) {
  const today = (request.validatedQuery as { localDate?: string } | undefined)?.localDate ?? new Date().toISOString().slice(0, 10);
  response.json(await friendsOf(viewer(request), today));
}

export async function patchFriendStreak(request: AuthenticatedRequest, response: Response) {
  reply(response, await setFriendStreak(viewer(request), param(request, "userId"), (request.validatedBody as FriendStreakRequest).enabled));
}

export async function postFriendRequest(request: AuthenticatedRequest, response: Response) {
  reply(response, await sendFriendRequest(viewer(request), request.validatedBody as SendFriendRequest), (outcome) => ({ outcome }));
}

export async function postAcceptRequest(request: AuthenticatedRequest, response: Response) {
  reply(response, await acceptRequest(viewer(request), param(request, "requestId")));
}

export async function postDeclineRequest(request: AuthenticatedRequest, response: Response) {
  reply(response, await declineRequest(viewer(request), param(request, "requestId")));
}

export async function deleteFriendRequest(request: AuthenticatedRequest, response: Response) {
  reply(response, await cancelRequest(viewer(request), param(request, "requestId")));
}

export async function deleteFriend(request: AuthenticatedRequest, response: Response) {
  await removeFriend(viewer(request), param(request, "userId"));
  response.status(204).send();
}

export async function getBlocks(request: AuthenticatedRequest, response: Response) {
  response.json({ users: await blockedUsers(viewer(request)) });
}

export async function postBlock(request: AuthenticatedRequest, response: Response) {
  reply(response, await blockUser(viewer(request), (request.validatedBody as { userId: string }).userId));
}

export async function deleteBlock(request: AuthenticatedRequest, response: Response) {
  await unblockUser(viewer(request), param(request, "userId"));
  response.status(204).send();
}

export async function postReport(request: AuthenticatedRequest, response: Response) {
  reply(response, await reportUser(viewer(request), request.validatedBody as ReportRequest));
}

export async function getPrivacy(request: AuthenticatedRequest, response: Response) {
  response.json(await prisma.user.findUniqueOrThrow({ where: { id: viewer(request) }, select: PRIVACY_SELECT }));
}

export async function patchPrivacy(request: AuthenticatedRequest, response: Response) {
  response.json(await prisma.user.update({ where: { id: viewer(request) }, data: request.validatedBody as Partial<PrivacySettings>, select: PRIVACY_SELECT }));
}
