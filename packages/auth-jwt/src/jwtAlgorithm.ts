/**
 * Fixed JWT algorithm for HS256 symmetric signing used across Platybit services.
 *
 * Responsibility: prevent algorithm confusion by pinning verify/sign options.
 * Layer: @project/auth-jwt
 * Depends on: none
 * Consumers: signAccessToken.ts, signRefreshToken.ts, verifyAccessToken.ts, verifyRefreshToken.ts
 */

export const JWT_SIGNING_ALGORITHM = "HS256" as const;
