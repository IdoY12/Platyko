/**
 * Express rate limiters tuned for credential, refresh, and logout traffic.
 *
 * Responsibility: throttle brute-force on tight routes; allow higher refresh volume.
 * Layer: backend middlewares
 * Depends on: express-rate-limit
 * Consumers: routers/auth.ts
 */

import rateLimit from "express-rate-limit";

const AUTH_WINDOW_MS = 15 * 60 * 1000;

const limiter = (max: number) =>
  rateLimit({
    windowMs: AUTH_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });

// Registration is limited more strictly in production to slow enumeration attacks
export const authRegisterRateLimiter = process.env.NODE_ENV === "production" ? limiter(8) : limiter(100);
export const authLoginRateLimiter = limiter(8);
export const authRefreshRateLimiter = limiter(60);
export const authLogoutRateLimiter = limiter(40);
// Wrong-code attempts are also capped per code in the DB (5); this only stops floods
export const authVerifyEmailRateLimiter = limiter(30);
// Resend is additionally throttled per user (60 s cooldown via EmailVerification.lastSentAt)
export const authResendVerificationRateLimiter = limiter(10);