import type { AuthTokenPayload } from "./authTokenPayload.js";

export function parseVerifiedPayload(payload: unknown): AuthTokenPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid token payload");
  }

  const record = payload as Record<string, unknown>;

  if (
    typeof record.userId !== "string" ||
    typeof record.email !== "string" ||
    typeof record.tokenVersion !== "number"
  ) {
    throw new Error("Invalid token shape");
  }

  return { userId: record.userId, email: record.email, tokenVersion: record.tokenVersion };
}
