import { afterAll, describe, expect, it } from "vitest";
import { creditLeagueXp, prisma } from "@project/db";
import { currentLeagueOf, setLeagueMembership } from "./currentLeague.js";

/** Runs against a real database (CI's migrations job, or a local one) when INTEGRATION_DATABASE=1. */
const RUN = process.env.INTEGRATION_DATABASE === "1";
const PREFIX = `lg${Date.now().toString(36)}`;
// A week long past, so the test's groups never meet real learners or another run.
const DAY = "2001-01-10";
const WEEK_START = "2001-01-08";
const user = (id: string) => prisma.user.create({ data: { username: `${PREFIX}${id}`, email: `${PREFIX}${id}@example.test`, hashedPassword: "hash" } });

describe.skipIf(!RUN)("weekly league", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
    await prisma.leagueGroup.deleteMany({ where: { weekStart: { in: [WEEK_START, "2001-01-01"] } } });
  });

  it("enrols on the first XP, ranks by weekly XP and shares a rank on equal XP", async () => {
    // One after another: equal XP is ordered by id, and ids follow creation order.
    const first = await user("a");
    const second = await user("b");
    const third = await user("c");
    expect(await currentLeagueOf(first.id, DAY)).toEqual({ status: "waiting", weekStart: WEEK_START, weekEnd: "2001-01-14" });
    await creditLeagueXp(prisma, first.id, 40, DAY);
    await creditLeagueXp(prisma, first.id, 30, DAY);
    await creditLeagueXp(prisma, second.id, 50, DAY);
    await creditLeagueXp(prisma, third.id, 50, DAY);
    const league = await currentLeagueOf(second.id, DAY);
    expect(league.status === "active" && league.standings.map((standing) => [standing.username, standing.weeklyXp, standing.rank])).toEqual([
      [`${PREFIX}a`, 70, 1],
      [`${PREFIX}b`, 50, 2],
      [`${PREFIX}c`, 50, 2],
    ]);
    expect(league.status === "active" && league.ownRank).toBe(2);
  });

  it("groups by last week's activity", async () => {
    const [busy, quiet] = await Promise.all([user("d"), user("e")]);
    await creditLeagueXp(prisma, busy.id, 2000, "2001-01-03");
    await creditLeagueXp(prisma, busy.id, 10, DAY);
    await creditLeagueXp(prisma, quiet.id, 10, DAY);
    const [busyRow, quietRow] = await Promise.all([busy, quiet].map((member) => prisma.leagueMembership.findUniqueOrThrow({ where: { userId_weekStart: { userId: member.id, weekStart: WEEK_START } }, select: { group: { select: { activityBand: true } } } })));
    expect([busyRow.group.activityBand, quietRow.group.activityBand]).toEqual([3, 0]);
  });

  it("leaving removes the learner from this week's group and stops enrolment until they rejoin", async () => {
    const leaver = await user("f");
    await creditLeagueXp(prisma, leaver.id, 20, DAY);
    await setLeagueMembership(leaver.id, false, DAY);
    expect(await currentLeagueOf(leaver.id, DAY)).toEqual({ status: "left" });
    await creditLeagueXp(prisma, leaver.id, 20, DAY);
    expect(await prisma.leagueMembership.count({ where: { userId: leaver.id } })).toBe(0);
    await setLeagueMembership(leaver.id, true, DAY);
    await creditLeagueXp(prisma, leaver.id, 20, DAY);
    expect((await currentLeagueOf(leaver.id, DAY)).status).toBe("active");
  });
});
