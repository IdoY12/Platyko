/**
 * Compares the legacy data with what the `redesign_models` migration copied into the new model
 * (PRD 15.3) and exits non-zero on any mismatch. The expected values are recomputed here in
 * TypeScript, with the shared XP functions, so the SQL of the migration is checked independently.
 *
 * Run right after the migration, before legacy writes resume:
 * `npm --prefix backend run migrate:verify-redesign`.
 */
import { prisma, type ExperienceLevel, type MatchMode, type Track } from "@project/db";
import { convertLegacyXp, levelForXp } from "@project/xp-constants";

const FRIEND_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

const STARTING_TRACK_BY_EXPERIENCE_LEVEL: Record<ExperienceLevel, Track> = {
  JUNIOR: "BEGINNER",
  MID: "INTERMEDIATE",
  SENIOR: "ADVANCED",
};

type CheckResult = { check: string; checked: number; mismatches: string[] };

function runCheck<Subject>(check: string, subjects: Subject[], findMismatch: (subject: Subject) => string | null): CheckResult {
  const mismatches = subjects.map(findMismatch).filter((mismatch): mismatch is string => mismatch !== null);
  return { check, checked: subjects.length, mismatches };
}

function expectedButGot(subject: string, expected: unknown, actual: unknown): string | null {
  const expectedText = JSON.stringify(expected);
  const actualText = JSON.stringify(actual);
  return expectedText === actualText ? null : `${subject}: expected ${expectedText}, got ${actualText}`;
}

const [users, usersWithWrongUsernameLower, duelSessions, databaseNameRows] = await Promise.all([
  prisma.user.findMany({
    select: {
      id: true, googleId: true, appleSub: true, activeExperienceLevel: true, friendCode: true,
      xpTotal: true, level: true, streakCurrent: true, streakBest: true,
      streakLastActivityDate: true, streakLastCheckedDate: true, startingTrack: true,
      progressRows: { select: { xpTotal: true, streakCurrent: true, streakLastActivityDate: true, streakLastCheckedDate: true } },
      identities: { select: { provider: true, subject: true } },
    },
  }),
  prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE "usernameLower" <> lower("username")`,
  prisma.duelSession.findMany(),
  prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS "name"`,
]);
const matches = await prisma.match.findMany({
  where: { id: { in: duelSessions.map((duelSession) => duelSession.id) } },
  include: { participants: { orderBy: { seat: "asc" } } },
});
const matchById = new Map(matches.map((match) => [match.id, match]));

type VerifiedUser = (typeof users)[number];
type LegacyDuelSession = (typeof duelSessions)[number];

function legacyStreakOf(user: VerifiedUser): number {
  return Math.max(0, ...user.progressRows.map((progressRow) => progressRow.streakCurrent));
}

/** The dates must be those of a row that holds the highest streak and, among those, the latest activity. */
function streakDatesMismatch(user: VerifiedUser): string | null {
  const rowsWithHighestStreak = user.progressRows.filter((progressRow) => progressRow.streakCurrent === legacyStreakOf(user));
  const latestActivityDate = rowsWithHighestStreak.map((progressRow) => progressRow.streakLastActivityDate ?? "").sort().at(-1) ?? "";
  const acceptedDates = rowsWithHighestStreak
    .filter((progressRow) => (progressRow.streakLastActivityDate ?? "") === latestActivityDate)
    .map((progressRow) => [progressRow.streakLastActivityDate, progressRow.streakLastCheckedDate]);
  const actualDates = [user.streakLastActivityDate, user.streakLastCheckedDate];
  const isAccepted = (acceptedDates.length > 0 ? acceptedDates : [[null, null]]).some(
    (dates) => JSON.stringify(dates) === JSON.stringify(actualDates),
  );
  return isAccepted ? null : `user ${user.id}: streak dates ${JSON.stringify(actualDates)} match no legacy row with the highest streak`;
}

function isSelfPlay(duelSession: LegacyDuelSession): boolean {
  return duelSession.player1Id === duelSession.player2Id;
}

function matchMismatch(duelSession: LegacyDuelSession): string | null {
  const match = matchById.get(duelSession.id);
  if (!match) return `duel ${duelSession.id}: no match`;
  const endTime = (duelSession.endedAt ?? duelSession.startedAt).toISOString();
  return expectedButGot(
    `duel ${duelSession.id}`,
    { rounds: duelSession.roundsPlayed, startedAt: endTime, endedAt: endTime, itemIds: [], track: "BEGINNER" },
    { rounds: match.rounds, startedAt: match.startedAt.toISOString(), endedAt: match.endedAt.toISOString(), itemIds: match.itemIds, track: match.track },
  );
}

function participantsMismatch(duelSession: LegacyDuelSession, expectedMode: MatchMode): string | null {
  const placementOf = (userId: string): number => (duelSession.winnerId === null || duelSession.winnerId === userId ? 1 : 2);
  const bothSeats = [
    { seat: 0, userId: duelSession.player1Id, score: duelSession.player1Score },
    { seat: 1, userId: duelSession.player2Id, score: duelSession.player2Score },
  ];
  const expectedParticipants = (isSelfPlay(duelSession) ? bothSeats.slice(0, 1) : bothSeats).map((seat) => ({
    ...seat,
    placement: placementOf(seat.userId),
    isGhost: false,
  }));
  const match = matchById.get(duelSession.id);
  const actualParticipants = (match?.participants ?? []).map(({ seat, userId, score, placement, isGhost }) => ({
    seat, userId, score, placement, isGhost,
  }));
  return expectedButGot(
    `duel ${duelSession.id}`,
    { mode: expectedMode, participants: expectedParticipants },
    { mode: match?.mode, participants: actualParticipants },
  );
}

const expectedIdentities = users.flatMap((user) => [
  ...(user.googleId ? [{ user, provider: "GOOGLE" as const, subject: user.googleId }] : []),
  ...(user.appleSub ? [{ user, provider: "APPLE" as const, subject: user.appleSub }] : []),
]);
const friendCodeOwners = new Map<string, number>();
for (const user of users) friendCodeOwners.set(user.friendCode, (friendCodeOwners.get(user.friendCode) ?? 0) + 1);

const results: CheckResult[] = [
  runCheck("user xpTotal = floor(sum of legacy xpTotal / 25)", users, (user) =>
    expectedButGot(`user ${user.id}`, convertLegacyXp(user.progressRows.reduce((sum, progressRow) => sum + progressRow.xpTotal, 0)), user.xpTotal),
  ),
  runCheck("user level = levelForXp(xpTotal)", users, (user) => expectedButGot(`user ${user.id}`, levelForXp(user.xpTotal), user.level)),
  runCheck("user streakCurrent and streakBest = highest legacy streak", users, (user) =>
    expectedButGot(`user ${user.id}`, [legacyStreakOf(user), legacyStreakOf(user)], [user.streakCurrent, user.streakBest]),
  ),
  runCheck("user streak dates come from the row holding that streak", users, streakDatesMismatch),
  runCheck("user startingTrack follows activeExperienceLevel", users, (user) =>
    expectedButGot(
      `user ${user.id}`,
      user.activeExperienceLevel ? STARTING_TRACK_BY_EXPERIENCE_LEVEL[user.activeExperienceLevel] : null,
      user.startingTrack,
    ),
  ),
  runCheck("identity exists for every googleId and appleSub", expectedIdentities, ({ user, provider, subject }) =>
    user.identities.some((identity) => identity.provider === provider && identity.subject === subject)
      ? null
      : `user ${user.id}: no ${provider} identity`,
  ),
  runCheck("user friendCode is 8 allowed characters and unique", users, (user) =>
    FRIEND_CODE_PATTERN.test(user.friendCode) && friendCodeOwners.get(user.friendCode) === 1
      ? null
      : `user ${user.id}: friend code "${user.friendCode}" is malformed or shared`,
  ),
  {
    check: "user usernameLower = lower(username)",
    checked: users.length,
    mismatches: usersWithWrongUsernameLower.map((user) => `user ${user.id}: usernameLower differs`),
  },
  runCheck("duel -> match with the same id, rounds and end time", duelSessions, matchMismatch),
  runCheck(
    "two-player duel -> RANKED match, two participants, scores, placements",
    duelSessions.filter((duelSession) => !isSelfPlay(duelSession)),
    (duelSession) => participantsMismatch(duelSession, "RANKED"),
  ),
  runCheck("self-play duel -> GHOST match, one participant", duelSessions.filter(isSelfPlay), (duelSession) =>
    participantsMismatch(duelSession, "GHOST"),
  ),
];

console.log(`Redesign migration check on database "${databaseNameRows[0].name}"`);
console.table(results.map(({ check, checked, mismatches }) => ({ check, checked, mismatches: mismatches.length })));

const allMismatches = results.flatMap((result) => result.mismatches.map((mismatch) => `[${result.check}] ${mismatch}`));
for (const mismatch of allMismatches) console.error(mismatch);
console.log(allMismatches.length === 0 ? "PASS: the new model matches the legacy data." : `FAIL: ${allMismatches.length} mismatch(es).`);
await prisma.$disconnect();
process.exit(allMismatches.length === 0 ? 0 : 1);
