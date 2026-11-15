import { describe, expect, it } from "vitest";
import { registerBodySchema } from "./authValidators.js";

describe("sign-up body", () => {
  it("keeps the guest's preferences and drops any progress number the client sends (criterion 20.4)", () => {
    const body = registerBodySchema.parse({
      email: "learner@example.test",
      username: "learner",
      password: "Correct-horse-9",
      experienceLevel: "MID",
      language: "he",
      xpTotal: 99_999,
      streakCurrent: 365,
      blockProgress: { JUNIOR: { a: 9 } },
    });
    expect(body).toMatchObject({ experienceLevel: "MID", language: "he" });
    expect(body).not.toHaveProperty("xpTotal");
    expect(body).not.toHaveProperty("streakCurrent");
    expect(body).not.toHaveProperty("blockProgress");
  });
});
