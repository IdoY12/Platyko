import rateLimit from "express-rate-limit";
import { Router } from "express";
import { codePuzzleAllHandler } from "../controllers/codePuzzle/codePuzzleAllHandler.js";
import { codePuzzleSubmitHandler } from "../controllers/codePuzzle/codePuzzleSubmitHandler.js";
import { optionalAuthMiddleware } from "../middlewares/auth.js";
import { validateBody, validateParams } from "../middlewares/validateBody.js";
import { codePuzzleSubmitBodySchema, codePuzzleSubmitParamsSchema } from "../validators/codePuzzleValidators.js";

const submitLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
const allLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

export const codePuzzlesRouter = Router();

codePuzzlesRouter.get("/all", allLimiter, codePuzzleAllHandler);
codePuzzlesRouter.post(
  "/:id/submit",
  submitLimiter,
  optionalAuthMiddleware,
  validateParams(codePuzzleSubmitParamsSchema),
  validateBody(codePuzzleSubmitBodySchema),
  codePuzzleSubmitHandler,
);
