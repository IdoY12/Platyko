import type { Response } from "express";
import type { AchievementsResponse } from "@project/api-contract";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";

/** GET /api/user/achievements — every badge recorded for the learner (PRD 14.2). */
export async function getAchievements(req: AuthenticatedRequest, res: Response) {
  const rows = await prisma.achievement.findMany({ where: { userId: req.user!.userId }, select: { code: true } });
  const body: AchievementsResponse = { codes: rows.map((row) => row.code) };
  res.json(body);
}
