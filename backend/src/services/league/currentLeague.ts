import type { LeagueResponse } from "@project/api-contract";
import { prisma } from "@project/db";
import { reviewDueDate } from "@project/learning-logic";
import { noLaterThanTomorrow } from "@project/streak-logic";
import { leagueWeekStart } from "@project/xp-constants";

/** The learner's league this week (PRD 14.5): their group ranked by weekly XP; equal XP shares a rank. */
export async function currentLeagueOf(userId: string, localDate: string): Promise<LeagueResponse> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { leagueOptOut: true } });
  if (user.leagueOptOut) return { status: "left" };
  const weekStart = leagueWeekStart(noLaterThanTomorrow(localDate));
  const weekEnd = reviewDueDate(weekStart, 6);
  const membership = await prisma.leagueMembership.findUnique({ where: { userId_weekStart: { userId, weekStart } }, select: { groupId: true } });
  if (!membership) return { status: "waiting", weekStart, weekEnd };

  const members = await prisma.leagueMembership.findMany({
    where: { groupId: membership.groupId },
    orderBy: [{ weeklyXp: "desc" }, { userId: "asc" }],
    select: { userId: true, weeklyXp: true, user: { select: { username: true, avatarUrl: true } } },
  });
  const standings = members.map((member) => ({
    id: member.userId,
    username: member.user.username,
    avatarUrl: member.user.avatarUrl,
    weeklyXp: member.weeklyXp,
    rank: 1 + members.filter((other) => other.weeklyXp > member.weeklyXp).length,
  }));
  return { status: "active", weekStart, weekEnd, standings, ownRank: standings.find((standing) => standing.id === userId)!.rank };
}

/** Leaving takes the learner out of this week's group at once; joining again enrols them with their next XP. */
export async function setLeagueMembership(userId: string, enabled: boolean, localDate: string): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { leagueOptOut: !enabled } }),
    ...(enabled ? [] : [prisma.leagueMembership.deleteMany({ where: { userId, weekStart: leagueWeekStart(noLaterThanTomorrow(localDate)) } })]),
  ]);
}
