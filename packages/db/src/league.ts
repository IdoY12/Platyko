import type { Prisma, PrismaClient } from "@prisma/client";
import { LEAGUE_GROUP_SIZE, leagueActivityBand, leagueWeekStart } from "@project/xp-constants";

type Database = PrismaClient | Prisma.TransactionClient;

/**
 * Adds XP to the learner's weekly league (PRD 14.5). The first XP of a week enrols them in a
 * group with room, among learners who were about as active the week before; a learner who left
 * the league is never enrolled. `date` is the learner's calendar day.
 */
export async function creditLeagueXp(db: Database, userId: string, xp: number, date: string): Promise<void> {
  if (xp <= 0) return;
  const weekStart = leagueWeekStart(date);
  const credited = await db.leagueMembership.updateMany({ where: { userId, weekStart }, data: { weeklyXp: { increment: xp } } });
  if (credited.count > 0) return;

  const user = await db.user.findUnique({ where: { id: userId }, select: { leagueOptOut: true } });
  if (!user || user.leagueOptOut) return;
  const lastWeek = await db.leagueMembership.findUnique({ where: { userId_weekStart: { userId, weekStart: leagueWeekStart(date, 1) } }, select: { weeklyXp: true } });
  const activityBand = leagueActivityBand(lastWeek?.weeklyXp ?? 0);
  const groups = await db.leagueGroup.findMany({ where: { weekStart, activityBand }, orderBy: { id: "asc" }, select: { id: true, _count: { select: { memberships: true } } } });
  const groupId = groups.find((group) => group._count.memberships < LEAGUE_GROUP_SIZE)?.id ?? (await db.leagueGroup.create({ data: { weekStart, activityBand } })).id;
  // Upsert: a second credit racing this one may have enrolled the learner a moment earlier.
  await db.leagueMembership.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, groupId, weeklyXp: xp },
    update: { weeklyXp: { increment: xp } },
  });
}
