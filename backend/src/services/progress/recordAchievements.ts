import type { Prisma } from "@prisma/client";
import { earnedAchievements, learningFacts, type ProgressSnapshot } from "@project/learning-logic";
import { loadContentMap } from "../content/contentCatalog.js";

/**
 * Stores the badges a learner's progress now earns (PRD 14.2), with the shared rules the app
 * shows them with. A badge is never taken back: rows are only added.
 */
export async function recordAchievements(tx: Prisma.TransactionClient, userId: string, snapshot: ProgressSnapshot): Promise<void> {
  const codes = earnedAchievements(learningFacts(snapshot, (await loadContentMap()).units));
  if (codes.length > 0) await tx.achievement.createMany({ data: codes.map((code) => ({ userId, code })), skipDuplicates: true });
}
