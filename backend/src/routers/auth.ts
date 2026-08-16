/**
 * Express router for registration, login, token refresh, profile bootstrap, and logout.
 *
 * Responsibility: mount auth handlers with per-route rate limits and JWT gate for /me.
 * Layer: backend HTTP
 * Depends on: auth controllers, authMiddleware, authRateLimiters, validateBody middleware, validators/authValidators
 * Consumers: app.ts
 */

import { Router } from "express";
import { authAppleHandler } from "../controllers/auth/authAppleHandler.js";
import { authGoogleHandler } from "../controllers/auth/authGoogleHandler.js";
import { authLoginHandler } from "../controllers/auth/authLoginHandler.js";
import { authLogoutHandler } from "../controllers/auth/authLogoutHandler.js";
import { authMeHandler } from "../controllers/auth/authMeHandler.js";
import { authPasswordResetConfirmHandler } from "../controllers/auth/authPasswordResetConfirmHandler.js";
import { authPasswordResetRequestHandler } from "../controllers/auth/authPasswordResetRequestHandler.js";
import { authRefreshHandler } from "../controllers/auth/authRefreshHandler.js";
import { authRegisterHandler } from "../controllers/auth/authRegisterHandler.js";
import { authResendVerificationHandler } from "../controllers/auth/authResendVerificationHandler.js";
import { authVerifyEmailHandler } from "../controllers/auth/authVerifyEmailHandler.js";
import { authMiddleware } from "../middlewares/auth.js";
import {
  authLoginRateLimiter,
  authLogoutRateLimiter,
  authPasswordResetConfirmRateLimiter,
  authPasswordResetRequestRateLimiter,
  authRefreshRateLimiter,
  authRegisterRateLimiter,
  authResendVerificationRateLimiter,
  authVerifyEmailRateLimiter,
} from "../middlewares/authRateLimiters.js";
import { validateBody } from "../middlewares/validateBody.js";
import { appleAuthBodySchema } from "../validators/appleAuthValidators.js";
import { googleAuthBodySchema, loginBodySchema, refreshBodySchema, registerBodySchema } from "../validators/authValidators.js";
import { resendVerificationBodySchema, verifyEmailBodySchema } from "../validators/emailVerificationValidators.js";
import { confirmPasswordResetBodySchema, requestPasswordResetBodySchema } from "../validators/passwordResetValidators.js";

export const authRouter = Router();

authRouter.post("/register", authRegisterRateLimiter, validateBody(registerBodySchema), authRegisterHandler);
authRouter.post("/verify-email", authVerifyEmailRateLimiter, validateBody(verifyEmailBodySchema), authVerifyEmailHandler);
authRouter.post("/verify-email/resend", authResendVerificationRateLimiter, validateBody(resendVerificationBodySchema), authResendVerificationHandler);
authRouter.post("/password-reset/request", authPasswordResetRequestRateLimiter, validateBody(requestPasswordResetBodySchema), authPasswordResetRequestHandler);
authRouter.post("/password-reset/confirm", authPasswordResetConfirmRateLimiter, validateBody(confirmPasswordResetBodySchema), authPasswordResetConfirmHandler);
authRouter.post("/login", authLoginRateLimiter, validateBody(loginBodySchema), authLoginHandler);
authRouter.post("/google", authLoginRateLimiter, validateBody(googleAuthBodySchema), authGoogleHandler);
authRouter.post("/apple", authLoginRateLimiter, validateBody(appleAuthBodySchema), authAppleHandler);
authRouter.post("/refresh", authRefreshRateLimiter, validateBody(refreshBodySchema), authRefreshHandler);
authRouter.get("/me", authMiddleware, authMeHandler);
authRouter.post("/logout", authLogoutRateLimiter, authLogoutHandler);
