import { SOCIAL_ERRORS, type ReportRequest } from "@project/api-contract";
import { prisma } from "@project/db";
import type { SocialResult } from "./friendRequests.js";

/**
 * Blocking (PRD 11.2) ends any friendship or request between the two at once; from then on the
 * blocked user cannot find, see, ask or invite the blocker, and neither sees the other.
 */
export async function blockUser(userId: string, blockedId: string): Promise<SocialResult> {
  if (userId === blockedId) return { ok: false, error: SOCIAL_ERRORS.userNotFound, status: 404 };
  const exists = await prisma.user.count({ where: { id: blockedId } });
  if (exists === 0) return { ok: false, error: SOCIAL_ERRORS.userNotFound, status: 404 };
  await prisma.$transaction([
    prisma.block.createMany({ data: [{ blockerId: userId, blockedId }], skipDuplicates: true }),
    prisma.friendship.deleteMany({ where: { OR: [{ requesterId: userId, addresseeId: blockedId }, { requesterId: blockedId, addresseeId: userId }] } }),
  ]);
  return { ok: true, value: undefined };
}

export async function unblockUser(userId: string, blockedId: string): Promise<void> {
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId } });
}

/** The users the viewer blocked, so they can be unblocked: only what the viewer already knew. */
export async function blockedUsers(userId: string): Promise<{ id: string; username: string }[]> {
  const rows = await prisma.block.findMany({ where: { blockerId: userId }, orderBy: { createdAt: "desc" }, select: { blocked: { select: { id: true, username: true } } } });
  return rows.map((row) => row.blocked);
}

/** Files a report for the manual review queue. A report about oneself or a missing user is refused. */
export async function reportUser(reporterId: string, report: ReportRequest): Promise<SocialResult> {
  if (report.userId === reporterId || (await prisma.user.count({ where: { id: report.userId } })) === 0) return { ok: false, error: SOCIAL_ERRORS.userNotFound, status: 404 };
  await prisma.report.create({ data: { reporterId, targetUserId: report.userId, targetKind: report.target, reason: report.reason } });
  return { ok: true, value: undefined };
}
