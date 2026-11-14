import { describe, expect, it } from "vitest";
import { authAccountFields } from "./authAccountFields.js";

const passwordAccount = { hashedPassword: "hash", language: "he", identities: [] };

describe("authAccountFields", () => {
  it("reports the password, the first linked provider and the stored language", () => {
    expect(authAccountFields(passwordAccount)).toEqual({ hasPassword: true, authProvider: null, language: "he" });
    expect(authAccountFields({ ...passwordAccount, hashedPassword: null, identities: [{ provider: "APPLE" as const }, { provider: "GITHUB" as const }] })).toMatchObject({ hasPassword: false, authProvider: "apple" });
  });

  it("falls back to English for a language the app does not have", () => {
    expect(authAccountFields({ ...passwordAccount, language: "fr" }).language).toBe("en");
  });
});
