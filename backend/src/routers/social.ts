import rateLimit from "express-rate-limit";
import { Router } from "express";
import * as social from "../controllers/social/socialHandlers.js";
import type { AuthenticatedRequest } from "../@types/auth.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validateBody.js";
import { blockBodySchema, privacyBodySchema, reportBodySchema, requestIdParamsSchema, searchQuerySchema, sendFriendRequestSchema, userIdParamsSchema, usernameParamsSchema } from "../validators/socialValidators.js";

/** Social routes count per user, not per address (PRD 15.7): a shared network must not throttle its users together. */
const perUser = (windowMinutes: number, max: number) =>
  rateLimit({ windowMs: windowMinutes * 60_000, max, standardHeaders: true, legacyHeaders: false, keyGenerator: (request) => (request as AuthenticatedRequest).user?.userId ?? "anonymous" });

/** Friends, search, privacy, block and report (PRD 11.1, 11.2). Registered users only. */
export const socialRouter = Router();
socialRouter.use(authMiddleware);
socialRouter.use(perUser(1, 120));

socialRouter.get("/search", perUser(1, 30), validateQuery(searchQuerySchema), social.getSearch);
socialRouter.get("/users/:username", validateParams(usernameParamsSchema), social.getUserProfile);
socialRouter.get("/friends", social.getFriends);
socialRouter.post("/friends/requests", perUser(60, 60), validateBody(sendFriendRequestSchema), social.postFriendRequest);
socialRouter.post("/friends/requests/:requestId/accept", validateParams(requestIdParamsSchema), social.postAcceptRequest);
socialRouter.post("/friends/requests/:requestId/decline", validateParams(requestIdParamsSchema), social.postDeclineRequest);
socialRouter.delete("/friends/requests/:requestId", validateParams(requestIdParamsSchema), social.deleteFriendRequest);
socialRouter.delete("/friends/:userId", validateParams(userIdParamsSchema), social.deleteFriend);
socialRouter.get("/blocks", social.getBlocks);
socialRouter.post("/blocks", validateBody(blockBodySchema), social.postBlock);
socialRouter.delete("/blocks/:userId", validateParams(userIdParamsSchema), social.deleteBlock);
socialRouter.post("/reports", perUser(60, 20), validateBody(reportBodySchema), social.postReport);
socialRouter.get("/privacy", social.getPrivacy);
socialRouter.patch("/privacy", validateBody(privacyBodySchema), social.patchPrivacy);
