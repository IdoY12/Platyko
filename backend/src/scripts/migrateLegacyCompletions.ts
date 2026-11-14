/**
 * Copies the legacy completion history into `ItemAttempt` (PRD 15.3): every exercise in
 * `UserProgress.completedExerciseIds` and every puzzle in `User.puzzleXpSolveCounts` becomes one
 * correct, zero-XP attempt on the item that replaced it. Safe to run again: an attempt that
 * already exists is skipped. Nothing is written while any completion cannot be resolved.
 *
 * Run: `npm --prefix backend run migrate:legacy-completions [-- <path to the legacy item map>]`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePuzzleXpSolveCounts, prisma } from "@project/db";
import { z } from "zod";
import { planLegacyCompletionAttempts, type LegacyUserCompletions } from "./legacyCompletionMapping.js";

const repositoryRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const legacyItemMapPath = process.argv[2] ?? path.join(repositoryRoot, "content/migration/legacy-item-map.json");

const itemMap = z.record(z.string(), z.string()).parse(JSON.parse(await readFile(legacyItemMapPath, "utf8")));

const [users, exercises, puzzles, items] = await Promise.all([
  prisma.user.findMany({
    select: { id: true, puzzleXpSolveCounts: true, progressRows: { select: { completedExerciseIds: true } } },
    orderBy: { createdAt: "asc" },
  }),
  prisma.exercise.findMany({ select: { id: true, experienceLevel: true, orderIndex: true } }),
  prisma.codePuzzle.findMany({ select: { id: true, orderIndex: true } }),
  prisma.item.findMany({ where: { id: { in: Object.values(itemMap) } }, select: { id: true, version: true } }),
]);

const legacyCompletions: LegacyUserCompletions[] = users.map((user) => ({
  userId: user.id,
  completedExerciseIds: user.progressRows.flatMap((progressRow) => progressRow.completedExerciseIds),
  solvedPuzzleIds: Object.entries(parsePuzzleXpSolveCounts(user.puzzleXpSolveCounts))
    .filter(([, solveCount]) => solveCount > 0)
    .map(([puzzleId]) => puzzleId),
}));

const { attempts, problems } = planLegacyCompletionAttempts({
  users: legacyCompletions,
  exercises,
  puzzles,
  itemMap,
  itemVersions: new Map(items.map((item) => [item.id, item.version])),
});

if (problems.length > 0) {
  console.error(`Legacy completions cannot be migrated; nothing was written. ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  await prisma.$disconnect();
  process.exit(1);
}

const alreadyMigrated = new Set(
  (
    await prisma.itemAttempt.findMany({
      where: { clientAttemptId: { in: attempts.map((attempt) => attempt.clientAttemptId) } },
      select: { clientAttemptId: true },
    })
  ).map((attempt) => attempt.clientAttemptId),
);
const newAttempts = attempts.filter((attempt) => !alreadyMigrated.has(attempt.clientAttemptId));

await prisma.itemAttempt.createMany({
  data: newAttempts.map((attempt) => ({ ...attempt, correct: true, attemptNo: 1, context: "MIGRATED" as const, xpAwarded: 0 })),
  skipDuplicates: true,
});

const countForUser = (list: Array<{ userId: string }>, userId: string): number =>
  list.filter((entry) => entry.userId === userId).length;

console.table(
  legacyCompletions.map((user) => ({
    userId: user.userId,
    legacyExercises: user.completedExerciseIds.length,
    legacyPuzzles: user.solvedPuzzleIds.length,
    items: countForUser(attempts, user.userId),
    inserted: countForUser(newAttempts, user.userId),
    alreadyMigrated: countForUser(attempts, user.userId) - countForUser(newAttempts, user.userId),
  })),
);
console.log(`Inserted ${newAttempts.length} migrated attempt(s); ${alreadyMigrated.size} already existed.`);
await prisma.$disconnect();
