import { normalizeEmail } from "@project/user-credentials";
import { OAuth2Client } from "google-auth-library";
import config from "config";

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<{ email: string; googleId: string; name?: string }> {
  const web = config.get<string>("app.googleWebClientId").trim();
  const ios = config.get<string>("app.googleIosClientId").trim();
  const audience = ios ? [web, ios] : web;
  const client = new OAuth2Client(web);
  const ticket = await client.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload?.email || payload.email_verified !== true || !payload.sub) throw new Error("invalid-google-token");
  return { email: normalizeEmail(payload.email), googleId: payload.sub, name: payload.name ?? undefined };
}
