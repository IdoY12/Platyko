import { describe, expect, it, vi } from "vitest";

vi.mock("../../utils/passwordHashing.js", () => ({ hashPassword: vi.fn(async () => "hash") }));
vi.mock("./sendAccountExistsEmail.js", () => ({ sendAccountExistsEmail: vi.fn(async () => true) }));

const { answerRegistrationForExistingEmail } = await import("./registrationForExistingEmail.js");
const { hashPassword } = await import("../../utils/passwordHashing.js");
const { sendAccountExistsEmail } = await import("./sendAccountExistsEmail.js");

describe("answerRegistrationForExistingEmail", () => {
  it("does a new sign-up's work, emails the owner a notice and returns a token that verifies nothing", async () => {
    const answer = await answerRegistrationForExistingEmail("owner@example.com", "Passw0rd!x");
    expect(answer).toMatchObject({ emailSent: true });
    expect("registrationToken" in answer && answer.registrationToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(hashPassword).toHaveBeenCalledWith("Passw0rd!x");
    expect(sendAccountExistsEmail).toHaveBeenCalledWith("owner@example.com");
  });

  it("keeps the same cooldown a real sign-up has", async () => {
    await answerRegistrationForExistingEmail("again@example.com", "Passw0rd!x");
    const second = await answerRegistrationForExistingEmail("again@example.com", "Passw0rd!x");
    expect(second).toMatchObject({ cooldownSeconds: expect.any(Number) as number });
    expect(sendAccountExistsEmail).toHaveBeenCalledTimes(2);
  });
});
