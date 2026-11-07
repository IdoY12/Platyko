/**
 * Express rate limiters tuned for credential, refresh, and logout traffic.
 *
 * Responsibility: throttle brute-force on tight routes; allow higher refresh volume.
 * Layer: backend middlewares
 * Depends on: express-rate-limit, config (env selects the production register cap)
 * Consumers: routers/auth.ts
 */

import config from "config";
import rateLimit from "express-rate-limit";

const AUTH_WINDOW_MS = 15 * 60 * 1000;

const limiter = (max: number) =>
  rateLimit({
    windowMs: AUTH_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Object → JSON 429 body; the plain-text default is unreadable by clients expecting {error}
    message: { error: "Too many attempts. Please try again later." },
  });

// Registration is limited more strictly in production to slow enumeration attacks
export const authRegisterRateLimiter = config.get<string>("env") === "production" ? limiter(8) : limiter(100);
export const authLoginRateLimiter = limiter(8);

/**
 * Per-address cap on code emails (runs after validateBody, so the key is the normalised address).
 * A request counts unless it *finished* without queueing an email (`res.locals.codeEmailQueued`): a
 * dropped connection stays counted, a 409 / cooldown 429 / send failure is refunded. 5 per hour bounds
 * brute force at 25 guesses; a separate bucket per flow means sign-up spam cannot block a password reset.
 * The reset route marks every 200 as counted, account or not, so the cap reveals nothing.
 */
const perAddressCodeLimiter = (flow: string) =>
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (request) => `${flow}:${(request.validatedBody as { email: string }).email}`,
    // express-rate-limit refunds "successful" requests only on `finish`, never on an aborted `close`.
    requestWasSuccessful: (_request, response) => response.locals.codeEmailQueued !== true,
    skipSuccessfulRequests: true,
    message: { error: "Too many codes requested for this address. Try again in an hour." },
  });
export const signUpCodeLimiter = perAddressCodeLimiter("sign-up");
export const resetCodeLimiter = perAddressCodeLimiter("reset");
// A current-password check is a credential guess like login.
export const changePasswordRateLimiter = limiter(8);
export const authRefreshRateLimiter = limiter(60);
export const authLogoutRateLimiter = limiter(40);
// Wrong-code attempts are also capped per code in the DB (5); this only stops floods
export const authVerifyEmailRateLimiter = limiter(30);
// Resend is additionally throttled per user (60 s cooldown via PendingRegistration.lastSentAt)
export const authResendVerificationRateLimiter = limiter(10);
// Reset request sends an email; also throttled per user (60 s cooldown via PasswordReset.lastSentAt)
export const authPasswordResetRequestRateLimiter = limiter(10);
// Wrong-code attempts are also capped per code in the DB (5); this only stops floods
export const authPasswordResetConfirmRateLimiter = limiter(30);