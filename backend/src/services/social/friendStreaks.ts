import { SOCIAL_ERRORS } from "@project/api-contract";
import { prisma } from "@project/db";
import { earnedAchievements, FRIEND_STREAK_LIMIT, friendStreakDays, playFacts } from "@project/learning-logic";
import type { SocialResult } from "./friendRequests.js";

const acceptedBetween = (first: string, second: string) => ({ status: "ACCEPTED" as const, OR: [{ requesterId: first, addresseeId: second }, { requesterId: second, addresseeId: first }] });
const streaksOf = (userId: string) => prisma.friendship.count({ where: { status: "ACCEPTED", streakEnabled: true, OR: [{ requesterId: userId }, { addresseeId: userId }] } });

/** The current Friend Streak with each given friend, from the days each practised (an item answered). */
export async function friendStreaksFor(viewerId: string, friendIds: readonly string[], today: string): Promise<Record<string, number>> {
  if (friendIds.length === 0) return {};
  const days = await prisma.practiceDay.findMany({ where: { userId: { in: [viewerId, ...friendIds] }, itemsAnswered: { gt: 0 } }, select: { userId: true, date: true } });
  const datesOf = (userId: string) => days.filter((day) => day.userId === userId).map((day) => day.date);
  const own = datesOf(viewerId);
  const streaks = Object.fromEntries(friendIds.map((friendId) => [friendId, friendStreakDays(own, datesOf(friendId), today)]));
  // The 14-day Friend Streak badge (PRD 14.2) is recorded the moment a streak is seen to reach it.
  const codes = earnedAchievements(playFacts({ rankedWins: 0, bestTier: 0, bigRoomWins: 0, bestFriendStreak: Math.max(0, ...Object.values(streaks)) }));
  if (codes.length > 0) await prisma.achievement.createMany({ data: codes.map((code) => ({ userId: viewerId, code })), skipDuplicates: true });
  return streaks;
}

/** Starts or stops a Friend Streak; each of the two keeps one with at most five friends (PRD 11.1). */
export async function setFriendStreak(viewerId: string, friendId: string, enabled: boolean): Promise<SocialResult> {
  const friendship = await prisma.friendship.findFirst({ where: acceptedBetween(viewerId, friendId), select: { id: true, streakEnabled: true } });
  if (!friendship) return { ok: false, error: SOCIAL_ERRORS.notFriends, status: 404 };
  if (enabled && !friendship.streakEnabled) {
    const [own, theirs] = await Promise.all([streaksOf(viewerId), streaksOf(friendId)]);
    if (own >= FRIEND_STREAK_LIMIT || theirs >= FRIEND_STREAK_LIMIT) return { ok: false, error: SOCIAL_ERRORS.streakLimit, status: 409 };
  }
  await prisma.friendship.update({ where: { id: friendship.id }, data: { streakEnabled: enabled } });
  return { ok: true, value: undefined };
}
