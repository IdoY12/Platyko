import { TRACKS } from "@project/content-model";
import { isJumpTestPassed, jumpTestItemIds, withJumpedTrack, type AttemptRecord, type ProgressSnapshot } from "@project/learning-logic";
import type { Prisma } from "@prisma/client";
import { loadContentMap } from "../content/contentCatalog.js";

/** A sitting counts for a day: answers older than that belong to an earlier try. */
const SITTING_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Opens every track whose jump test the learner has passed (PRD 6.2). The pass is decided here
 * from the `JUMP_TEST` attempts of the last day (stored ones and the batch being saved), with the
 * shared selection and pass rule, so the app can only report answers, never a pass.
 */
export async function withPassedJumpTests(tx: Prisma.TransactionClient, userId: string, snapshot: ProgressSnapshot, batch: readonly AttemptRecord[]): Promise<ProgressSnapshot> {
  const isRightAtOnce = (attempt: AttemptRecord) => attempt.context === "JUMP_TEST" && attempt.attemptNo === 1 && attempt.correct;
  if (!batch.some((attempt) => attempt.context === "JUMP_TEST")) return snapshot;
  const units = (await loadContentMap()).units;
  const since = new Date(Date.now() - SITTING_WINDOW_MS);
  const rightAtOnce = await tx.itemAttempt.findMany({
    where: { userId, context: "JUMP_TEST", attemptNo: 1, correct: true, createdAt: { gte: since } },
    select: { itemId: true },
  });
  const rightItemIds = new Set([...rightAtOnce, ...batch.filter(isRightAtOnce)].map((attempt) => attempt.itemId));
  let opened = snapshot;
  for (const track of TRACKS.slice(1)) {
    if (opened.jumpedTracks.includes(track)) continue;
    const testItemIds = jumpTestItemIds(units, track);
    const right = testItemIds.filter((itemId) => rightItemIds.has(itemId)).length;
    if (isJumpTestPassed(right, testItemIds.length)) opened = withJumpedTrack(opened, track);
  }
  return opened;
}
