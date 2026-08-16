import { createRemoteJWKSet, jwtVerify } from "jose";
import config from "config";

const APPLE_ISSUER = "https://appleid.apple.com";
// Module-level so Apple's public keys are fetched once and cached across requests
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<{ appleSub: string; email?: string }> {
  const audience = config.get<string>("app.appleBundleId").trim();
  const { payload } = await jwtVerify(identityToken, appleJwks, { issuer: APPLE_ISSUER, audience });
  if (!payload.sub) throw new Error("invalid-apple-token");
  // Apple sends email_verified as boolean or the string "true" depending on the token
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  const email = typeof payload.email === "string" && emailVerified ? payload.email : undefined;
  return { appleSub: payload.sub, email };
}
