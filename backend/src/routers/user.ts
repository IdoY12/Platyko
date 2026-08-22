import rateLimit from "express-rate-limit";
import { raw, Router, type RequestHandler } from "express";
import {
  deleteAccount,
  getPreferences,
  getProfile,
  getProgressSummary,
  patchAvatar,
  patchPreferences,
  patchProfile,
  postChangePassword,
  postPracticeLog,
  putAvatarDirectUpload,
} from "../controllers/user/index.js";
import { authMiddleware } from "../middlewares/auth.js";
import { validateBody, validateQuery } from "../middlewares/validateBody.js";
import {
  deleteAccountBodySchema,
  patchAvatarBodySchema,
  patchPreferencesBodySchema,
  patchProfileBodySchema,
  postChangePasswordBodySchema,
  postPracticeLogBodySchema,
  progressSummaryQuerySchema,
} from "../validators/userValidators.js";

const userLimiter: RequestHandler = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

export const userRouter = Router();
userRouter.use(userLimiter);
userRouter.use(authMiddleware);

userRouter.get("/profile", getProfile);
userRouter.patch("/profile", validateBody(patchProfileBodySchema), patchProfile);
// raw() parses the binary image body as a Buffer for this route only.
// The app-level JSON parser skips non-application/json content types.
userRouter.put("/avatar/upload", raw({ type: "image/*", limit: "5mb" }), putAvatarDirectUpload);
userRouter.patch("/avatar", validateBody(patchAvatarBodySchema), patchAvatar);
userRouter.get("/progress-summary", validateQuery(progressSummaryQuerySchema), getProgressSummary);
userRouter.get("/preferences", getPreferences);
userRouter.patch("/preferences", validateBody(patchPreferencesBodySchema), patchPreferences);
userRouter.post("/practice-log", validateBody(postPracticeLogBodySchema), postPracticeLog);
userRouter.post("/change-password", validateBody(postChangePasswordBodySchema), postChangePassword);
userRouter.delete("/account", validateBody(deleteAccountBodySchema), deleteAccount);
