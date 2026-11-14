import { describe, expect, it } from "vitest";
import { authAccountFields } from "./authAccountFields.js";

const passwordAccount = { hashedPassword: "hash", googleId: null, appleSub: null, language: "he" };

describe("authAccountFields", () => {
  it("reports the password, the provider and the stored language", () => {
    expect(authAccountFields(passwordAccount)).toEqual({ hasPassword: true, authProvider: null, language: "he" });
    expect(authAccountFields({ ...passwordAccount, hashedPassword: null, appleSub: "sub" })).toMatchObject({ hasPassword: false, authProvider: "apple" });
  });

  it("falls back to English for a language the app does not have", () => {
    expect(authAccountFields({ ...passwordAccount, language: "fr" }).language).toBe("en");
  });
});
