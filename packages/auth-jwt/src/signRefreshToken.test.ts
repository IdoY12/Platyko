import { describe, expect, it } from "vitest";
import { signAccessToken } from "./signAccessToken.js";
import { signRefreshToken } from "./signRefreshToken.js";
import { verifyRefreshToken } from "./verifyRefreshToken.js";

const payload = { userId: "user_1", email: "u@example.com", tokenVersion: 0 };
const secret = "unit-test-refresh-secret-that-is-long-enough-1234";

describe("refresh tokens", () => {
  it("are unique even when issued in the same second for the same payload", () => {
    const first = signRefreshToken(payload, secret);
    const second = signRefreshToken(payload, secret);
    expect(first).not.toBe(second);
  });

  it("still verify to the same typed payload", () => {
    expect(verifyRefreshToken(signRefreshToken(payload, secret), secret)).toEqual(payload);
  });

  it("are not accepted as access tokens or by the wrong secret", () => {
    expect(() => verifyRefreshToken(signAccessToken(payload, "another-secret"), secret)).toThrow();
    expect(() => verifyRefreshToken(signRefreshToken(payload, secret), "wrong-secret")).toThrow();
  });
});
