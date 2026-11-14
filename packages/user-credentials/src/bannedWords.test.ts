import { describe, expect, it } from "vitest";
import { containsBannedWord, USERNAME_NOT_ALLOWED, usernameValidationError } from "./index.js";

describe("containsBannedWord", () => {
  it("finds a banned word inside a name, through separators and letter swaps", () => {
    expect(containsBannedWord("BigShit99")).toBe(true);
    expect(containsBannedWord("f_u_c_k")).toBe(true);
    expect(containsBannedWord("b1tch")).toBe(true);
  });

  it("lets ordinary names pass, including ones that contain a short word", () => {
    for (const name of ["classic", "peacock", "cocktail_dev", "assistant", "sextant42", "titan", "grapefruit", "spicy_dev"]) expect(containsBannedWord(name)).toBe(false);
  });

  it("is part of the username rule the app and the server share", () => {
    expect(usernameValidationError("nazi")).toBe(USERNAME_NOT_ALLOWED);
    expect(usernameValidationError("river_coder")).toBeNull();
  });
});
