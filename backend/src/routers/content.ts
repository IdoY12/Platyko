import rateLimit from "express-rate-limit";
import { EXPLANATIONS_PER_DAY } from "@project/api-contract";
import type { AuthenticatedRequest } from "../@types/auth.js";
import { Router } from "express";
import { getContentMap, getItems, getLessonContent, postExplainMistake, postItemFeedback, postJudgeCode } from "../controllers/content/contentHandlers.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validateBody.js";
import { itemFeedbackBodySchema, itemParamsSchema, itemsQuerySchema, judgeCodeBodySchema, lessonParamsSchema } from "../validators/contentValidators.js";

const readLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
// Each judged answer runs learner code in an isolate: a tighter cap than plain reads.
const judgeLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
// "Explain my mistake": 10 a day per user (PRD 15.9). Past it the answer is "no explanation", not an error.
const explainLimiter = rateLimit({
  windowMs: 24 * 60 * 60_000,
  max: EXPLANATIONS_PER_DAY,
  keyGenerator: (request) => (request as AuthenticatedRequest).user?.userId ?? "anonymous",
  handler: (_request, response) => void response.json({ explanation: null }),
});
const feedbackLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

/** The question bank as the app reads it: the map, lessons and items are public (guests learn too). */
export const contentRouter = Router();

contentRouter.get("/map", readLimiter, getContentMap);
contentRouter.get("/lessons/:lessonId", readLimiter, validateParams(lessonParamsSchema), getLessonContent);
contentRouter.get("/items", readLimiter, validateQuery(itemsQuerySchema), getItems);
contentRouter.post("/items/:itemId/judge", judgeLimiter, validateParams(itemParamsSchema), validateBody(judgeCodeBodySchema), postJudgeCode);
contentRouter.post("/items/:itemId/explain", authMiddleware, explainLimiter, validateParams(itemParamsSchema), validateBody(judgeCodeBodySchema), postExplainMistake);
contentRouter.post("/items/:itemId/feedback", feedbackLimiter, authMiddleware, validateParams(itemParamsSchema), validateBody(itemFeedbackBodySchema), postItemFeedback);
