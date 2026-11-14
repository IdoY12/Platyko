import { describe, expect, it, vi } from "vitest";
vi.mock("@/services/auth", () => ({
  serverErrorMessage: (error: unknown) => (error as { serverMessage?: string }).serverMessage ?? null,
}));

import hebrew from "@project/locales/he.json";
import { PASSWORD_MIN_LEN, PASSWORD_TOO_SHORT, USERNAME_TAKEN_MESSAGE } from "@project/user-credentials";
import { localizedError, localizedMessage } from "./localizedMessage";
import { setActiveLanguage } from "./translate";

describe("localizedMessage", () => {
  it("translates a server message into the active language", () => {
    setActiveLanguage("he");
    expect(localizedMessage("Invalid credentials")).toBe(hebrew["errors.invalidCredentials"]);
    setActiveLanguage("en");
    expect(localizedMessage("Invalid credentials")).toBe("Email or password is incorrect.");
  });

  it("carries the number of a length rule and of the resend cooldown", () => {
    setActiveLanguage("en");
    expect(localizedMessage(PASSWORD_TOO_SHORT)).toBe(`Password needs at least ${PASSWORD_MIN_LEN} characters.`);
    expect(localizedMessage("Please wait 42s before requesting another code")).toBe("Wait 42 seconds before asking for another code.");
  });

  it("never shows an unknown or internal message", () => {
    setActiveLanguage("en");
    expect(localizedMessage("Request failed with status code 500")).toBe("Something went wrong. Try again.");
  });

  it("prefers the server's message over the error's own text", () => {
    setActiveLanguage("en");
    const httpError = Object.assign(new Error("Request failed with status code 409"), { serverMessage: USERNAME_TAKEN_MESSAGE });
    expect(localizedError(httpError)).toBe("This username is taken. Choose another.");
    expect(localizedError("not an error")).toBe("Something went wrong. Try again.");
  });
});
