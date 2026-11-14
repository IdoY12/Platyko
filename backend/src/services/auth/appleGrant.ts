import { createCipheriv, createDecipheriv, createPrivateKey, randomBytes, sign } from "node:crypto";
import config from "config";
import { prisma } from "@project/db";
import { logError, logInfo } from "../../utils/logger.js";

/**
 * Sign in with Apple grants (App Store guideline 5.1.1(v), PRD 15.7): at sign-in the one-time
 * authorization code is exchanged for Apple's refresh token, which is stored encrypted; deleting
 * the account revokes it. Without the Apple key configuration both steps are skipped and logged,
 * and sign-in works as before.
 */

const APPLE_AUTH_URL = "https://appleid.apple.com/auth";
const CLIENT_SECRET_LIFETIME_SECONDS = 300;
const IV_BYTES = 12;
const TAG_BYTES = 16;

type AppleKeys = { teamId: string; keyId: string; privateKey: string; clientId: string; tokenKey: Buffer };

function appleKeys(): AppleKeys | null {
  const settings = config.get<{ teamId: string; keyId: string; privateKey: string; tokenEncryptionKey: string }>("app.appleRevocation");
  const tokenKey = Buffer.from(settings.tokenEncryptionKey, "base64");
  if (!settings.teamId || !settings.keyId || !settings.privateKey || tokenKey.length !== 32) return null;
  return { teamId: settings.teamId, keyId: settings.keyId, privateKey: settings.privateKey.replace(/\\n/g, "\n"), clientId: config.get<string>("app.appleBundleId"), tokenKey };
}

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** The ES256 client secret Apple's token endpoints require, signed with the Sign in with Apple key. */
function clientSecret(keys: AppleKeys): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keys.keyId }));
  const claims = base64url(JSON.stringify({ iss: keys.teamId, iat: now, exp: now + CLIENT_SECRET_LIFETIME_SECONDS, aud: "https://appleid.apple.com", sub: keys.clientId }));
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key: createPrivateKey(keys.privateKey), dsaEncoding: "ieee-p1363" });
  return `${header}.${claims}.${base64url(signature)}`;
}

export function encryptToken(token: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const sealed = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString("base64");
}

export function decryptToken(stored: string, key: Buffer): string {
  const raw = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
}

async function postToApple(path: "token" | "revoke", fields: Record<string, string>): Promise<Response> {
  return fetch(`${APPLE_AUTH_URL}/${path}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields) });
}

/** Exchanges the sign-in's authorization code and keeps the refresh token for revocation. Never throws. */
export async function storeAppleGrant(userId: string, appleSub: string, authorizationCode: string): Promise<void> {
  const keys = appleKeys();
  if (!keys) return logInfo("[AUTH]", "apple-grant:skipped", { reason: "not-configured" });
  try {
    const reply = await postToApple("token", { client_id: keys.clientId, client_secret: clientSecret(keys), code: authorizationCode, grant_type: "authorization_code" });
    const body = (await reply.json()) as { refresh_token?: string };
    if (!reply.ok || !body.refresh_token) throw new Error(`token exchange failed with ${reply.status}`);
    const providerRefreshToken = encryptToken(body.refresh_token, keys.tokenKey);
    await prisma.authIdentity.upsert({
      where: { provider_subject: { provider: "APPLE", subject: appleSub } },
      create: { provider: "APPLE", subject: appleSub, userId, providerRefreshToken },
      update: { userId, providerRefreshToken },
    });
  } catch (error) {
    logError("[AUTH]", error, { phase: "apple-grant-store" });
  }
}

/** Revokes a deleted account's Apple grant. Never throws: the account is gone either way. */
export async function revokeAppleGrant(storedToken: string): Promise<void> {
  const keys = appleKeys();
  if (!keys) return logInfo("[AUTH]", "apple-grant:revoke-skipped", { reason: "not-configured" });
  try {
    const reply = await postToApple("revoke", { client_id: keys.clientId, client_secret: clientSecret(keys), token: decryptToken(storedToken, keys.tokenKey), token_type_hint: "refresh_token" });
    if (!reply.ok) throw new Error(`revoke failed with ${reply.status}`);
    logInfo("[AUTH]", "apple-grant:revoked", {});
  } catch (error) {
    logError("[AUTH]", error, { phase: "apple-grant-revoke" });
  }
}
