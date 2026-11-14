import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./appleGrant.js";

describe("Apple grant token storage", () => {
  const key = randomBytes(32);

  it("round-trips a refresh token and never stores it in the clear", () => {
    const stored = encryptToken("r.apple-refresh-token", key);
    expect(stored).not.toContain("apple-refresh-token");
    expect(decryptToken(stored, key)).toBe("r.apple-refresh-token");
  });

  it("rejects a token that was changed or read with another key", () => {
    const stored = Buffer.from(encryptToken("r.token", key), "base64");
    stored[stored.length - 1] ^= 1;
    expect(() => decryptToken(stored.toString("base64"), key)).toThrow();
    expect(() => decryptToken(encryptToken("r.token", key), randomBytes(32))).toThrow();
  });
});
