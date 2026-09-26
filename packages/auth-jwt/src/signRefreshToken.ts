/**
 * Creates a long-lived refresh JWT for session renewal flows.
 *
 * Responsibility: symmetric HS256 signing with explicit algorithm and a unique `jti`, so two
 * tokens issued in the same second for the same user never collide on the stored hash.
 * Layer: @project/auth-jwt
 * Depends on: authTokenPayload, refreshTokenJwtExpiry, jwtAlgorithm
 * Consumers: backend sessionJwtTokens wrapper
 */

import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "./authTokenPayload.js";
import { REFRESH_TOKEN_JWT_EXPIRY } from "./refreshTokenJwtExpiry.js";
import { JWT_SIGNING_ALGORITHM } from "./jwtAlgorithm.js";

export function signRefreshToken(payload: AuthTokenPayload, refreshSecret: string): string {
  return jwt.sign(payload, refreshSecret, {
    expiresIn: REFRESH_TOKEN_JWT_EXPIRY,
    algorithm: JWT_SIGNING_ALGORITHM,
    jwtid: randomUUID(),
  });
}
