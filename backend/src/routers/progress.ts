import rateLimit from "express-rate-limit";
import { Router } from "express";
import { deleteLessonResume, getProgress, postGuestMerge, postProgressAttempts, putLessonResume } from "../controllers/progress/progressHandlers.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody, validateQuery } from "../middlewares/validateBody.js";
import { guestProgressSchema, progressQuerySchema, saveResumeBodySchema, submitProgressBodySchema } from "../validators/progressValidators.js";

const progressLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

/** A registered learner's progress. Guests keep theirs on the device and upload it when they sign up. */
export const progressRouter = Router();

progressRouter.use(progressLimiter);
progressRouter.use(authMiddleware);
progressRouter.get("/", validateQuery(progressQuerySchema), getProgress);
progressRouter.post("/attempts", validateBody(submitProgressBodySchema), postProgressAttempts);
// Large: a guest may bring weeks of attempts. The body limit and the schema cap the size.
progressRouter.post("/guest-merge", validateBody(guestProgressSchema), postGuestMerge);
progressRouter.put("/resume", validateBody(saveResumeBodySchema), putLessonResume);
progressRouter.delete("/resume", deleteLessonResume);
