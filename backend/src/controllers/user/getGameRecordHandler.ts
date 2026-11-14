import type { Response } from "express";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { gameRecordOf } from "../../services/play/gameRecord.js";
import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import { logError } from "../../utils/logger.js";

/** GET /api/user/game-record — the profile's rating, record and recent games (PRD 14.1). */
export async function getGameRecord(req: AuthenticatedRequest, res: Response) {
  try {
    return res.json(await gameRecordOf(req.user!.userId));
  } catch (error) {
    logError("[USER]", error, { phase: "game-record", userId: req.user?.userId });
    const reply = unexpectedErrorReply(error, "Failed to load games");
    return res.status(reply.status).json(reply.body);
  }
}
