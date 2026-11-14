import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@project/db";
import { linkGitHub, unlinkGitHub } from "./githubAccount.js";
import { findOrCreateSocialUser } from "./socialAccountLinking.js";

/** Runs against a real database (CI's migrations job, or a local one) when INTEGRATION_DATABASE=1. */
const RUN = process.env.INTEGRATION_DATABASE === "1";
const PREFIX = `gh${Date.now().toString(36)}`;
const profile = (id: string) => ({ subject: `${PREFIX}${id}`, login: `octo${id}`, email: undefined });

describe.skipIf(!RUN)("linking and disconnecting GitHub", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  });

  it("links to one account only, and disconnecting deletes every piece of GitHub data", async () => {
    const owner = await prisma.user.create({ data: { username: `${PREFIX}a`, email: `${PREFIX}a@example.test`, hashedPassword: "hash" } });
    const other = await prisma.user.create({ data: { username: `${PREFIX}b`, email: `${PREFIX}b@example.test`, hashedPassword: "hash" } });
    expect(await linkGitHub(owner.id, profile("1"))).toBe("linked");
    expect(await linkGitHub(other.id, profile("1"))).toBe("taken");
    await prisma.user.update({ where: { id: owner.id }, data: { githubPublicRepos: 3, githubFollowers: 9, githubStatsConsent: true } });
    expect(await unlinkGitHub(owner.id)).toBe("linked");
    expect(await prisma.authIdentity.count({ where: { userId: owner.id, provider: "GITHUB" } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: owner.id }, select: { githubLogin: true, githubPublicRepos: true, githubFollowers: true, githubStatsConsent: true } })).toEqual({ githubLogin: null, githubPublicRepos: null, githubFollowers: null, githubStatsConsent: false });
  });

  it("refuses to disconnect GitHub when it is the account's only way to sign in", async () => {
    const { user } = await findOrCreateSocialUser("github", `${PREFIX}2`, `${PREFIX}c@example.test`, "octo");
    expect(await unlinkGitHub(user.id)).toBe("only-sign-in");
  });
});
