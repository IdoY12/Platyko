import rateLimit from "express-rate-limit";
import { Router } from "express";
import { learningGetExercisesHandler } from "../controllers/learning/learningGetExercisesHandler.js";
import { learningGetResumeHandler } from "../controllers/learning/learningGetResumeHandler.js";
import { learningResetProgressHandler } from "../controllers/learning/learningResetProgressHandler.js";
import { learningSubmitExerciseHandler } from "../controllers/learning/learningSubmitExerciseHandler.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import { learningSubmitExerciseBodySchema } from "../validators/learningValidators.js";

const learningLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false });

export const learningRouter = Router();

learningRouter.use(learningLimiter);
learningRouter.get("/exercises/:experienceLevel", learningGetExercisesHandler);
learningRouter.post(
  "/submit-exercise",
  authMiddleware,
  validateBody(learningSubmitExerciseBodySchema),
  learningSubmitExerciseHandler,
);
learningRouter.get("/resume", authMiddleware, learningGetResumeHandler);
learningRouter.delete("/progress", authMiddleware, learningResetProgressHandler);
