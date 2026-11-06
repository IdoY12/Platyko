import { verifyAccessToken } from "@project/auth-jwt/verifyAccessToken";
import type { AuthTokenPayload } from "@project/auth-jwt/authTokenPayload";
import { readJwtAccessSecretFromConfig } from "@project/server-kit/jwtSecrets";

export function verifySocketAccessToken(token: string): AuthTokenPayload {
  return verifyAccessToken(token, readJwtAccessSecretFromConfig());
}
