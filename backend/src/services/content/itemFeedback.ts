import { prisma } from "@project/db";
import type { ItemFeedbackRequest } from "@project/api-contract";

/** Reports from this many different users inside the window take an item out of service (PRD 7.6). */
const REPORTS_TO_FLAG = 3;
const REPORT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Stores one user's vote or report on an item. The third report from different users within
 * seven days flags the item, which removes it from lessons and from the duel pool at once and
 * with no manual step; it returns only through a new clean verification run.
 */
export async function recordItemFeedback(userId: string, itemId: string, feedback: ItemFeedbackRequest): Promise<"recorded" | "item-not-found"> {
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { status: true } });
  if (!item) return "item-not-found";
  const reported = feedback.reportReason !== undefined;
  const data = {
    ...(feedback.vote !== undefined ? { vote: feedback.vote } : {}),
    ...(reported ? { reportReason: feedback.reportReason, reportedAt: new Date() } : {}),
  };
  await prisma.itemFeedback.upsert({ where: { itemId_userId: { itemId, userId } }, create: { itemId, userId, ...data }, update: data });
  if (reported && item.status === "LIVE") {
    const recentReports = await prisma.itemFeedback.count({ where: { itemId, reportedAt: { gte: new Date(Date.now() - REPORT_WINDOW_MS) } } });
    if (recentReports >= REPORTS_TO_FLAG) {
      await prisma.item.updateMany({ where: { id: itemId, status: "LIVE" }, data: { status: "FLAGGED", flaggedAt: new Date() } });
    }
  }
  return "recorded";
}
