import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@project/db";
import { findOrCreateSocialUser } from "./socialAccountLinking.js";

/** Runs against a real database (CI's migrations job, or a local one) when INTEGRATION_DATABASE=1. */
const RUN = process.env.INTEGRATION_DATABASE === "1";
const PREFIX = `sl${Date.now().toString(36)}`;

describe.skipIf(!RUN)("social sign-in through AuthIdentity", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  });

  it("creates an account with its identity, and finds it again by the provider subject alone", async () => {
    const first = await findOrCreateSocialUser("github", `${PREFIX}-1`, `${PREFIX}a@example.test`, "octo");
    expect(first.isNew).toBe(true);
    expect(await prisma.authIdentity.count({ where: { userId: first.user.id, provider: "GITHUB" } })).toBe(1);
    const again = await findOrCreateSocialUser("github", `${PREFIX}-1`, undefined);
    expect(again).toMatchObject({ isNew: false, user: { id: first.user.id } });
  });

  it("refuses another provider's sign-in for an email that already has an account, naming the right one", async () => {
    await expect(findOrCreateSocialUser("google", `${PREFIX}-2`, `${PREFIX}a@example.test`)).rejects.toThrow("This email is linked to a GitHub account. Sign in with GitHub.");
    await expect(findOrCreateSocialUser("github", `${PREFIX}-3`, `${PREFIX}a@example.test`)).rejects.toThrow("This email is linked to a different GitHub account.");
  });
});
