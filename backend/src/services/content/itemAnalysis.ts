import { prisma } from "@project/db";
import { analyseItem, ITEM_ANALYSIS_MIN_ANSWERS, type FirstAnswer } from "@project/learning-logic";
import { logError, logInfo } from "../../utils/logger.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** The first run waits for the server to settle after a start. */
const FIRST_RUN_DELAY_MS = 60_000;

type Option = { correct?: boolean };

/**
 * Recomputes the item analysis (PRD 7.6) for every item with enough first answers on its current
 * version, and stores the indexes and review flags in `ItemAnalysis`. A learner's score is their
 * share of right first answers across the bank, which ranks learners for the discrimination index.
 */
export async function runItemAnalysis(): Promise<number> {
  const eligible = await prisma.$queryRaw<{ itemId: string; itemVersion: number }[]>`
    SELECT a."itemId", a."itemVersion" FROM "ItemAttempt" a JOIN "Item" i ON i.id = a."itemId" AND i.version = a."itemVersion"
    WHERE a."attemptNo" = 1 GROUP BY a."itemId", a."itemVersion" HAVING count(DISTINCT a."userId") >= ${ITEM_ANALYSIS_MIN_ANSWERS}`;
  if (eligible.length === 0) return 0;
  const scores = await prisma.$queryRaw<{ userId: string; score: number }[]>`
    SELECT "userId", avg(CASE WHEN correct THEN 1.0 ELSE 0.0 END)::float AS score FROM "ItemAttempt" WHERE "attemptNo" = 1 GROUP BY "userId"`;
  const scoreOf = new Map(scores.map((row) => [row.userId, row.score]));

  for (const { itemId, itemVersion } of eligible) {
    const [rows, item] = await Promise.all([
      prisma.$queryRaw<{ userId: string; correct: boolean; optionIndex: number | null }[]>`
        SELECT DISTINCT ON ("userId") "userId", correct, "optionIndex" FROM "ItemAttempt"
        WHERE "itemId" = ${itemId} AND "itemVersion" = ${itemVersion} AND "attemptNo" = 1 ORDER BY "userId", "createdAt"`,
      prisma.item.findUniqueOrThrow({ where: { id: itemId }, select: { payload: true } }),
    ]);
    const answers: FirstAnswer[] = rows.map((row) => ({ correct: row.correct, optionIndex: row.optionIndex, learnerScore: scoreOf.get(row.userId) ?? 0 }));
    const options = ((item.payload as { options?: Option[] }).options ?? []).map((option, index) => ({ option, index }));
    const wrongOptions = options.filter(({ option }) => option.correct === false).map(({ index }) => index);
    const statistics = analyseItem(answers, wrongOptions);
    if (!statistics) continue;
    const data = { itemVersion, answerCount: statistics.answerCount, difficultyIndex: statistics.difficultyIndex, discriminationIndex: statistics.discriminationIndex, flags: statistics.flags, computedAt: new Date() };
    await prisma.itemAnalysis.upsert({ where: { itemId }, create: { itemId, ...data }, update: data });
  }
  return eligible.length;
}

/** Runs the analysis a minute after start and then once a day; a failed run is logged and retried the next day. */
export function scheduleItemAnalysis(): void {
  const run = () =>
    runItemAnalysis().then(
      (analysed) => logInfo("[CONTENT]", "item-analysis:done", { analysed }),
      (error: unknown) => logError("[CONTENT]", error, { phase: "item-analysis" }),
    );
  setTimeout(() => {
    void run();
    setInterval(() => void run(), DAY_MS).unref();
  }, FIRST_RUN_DELAY_MS).unref();
}
