import { prisma } from "@project/db";
import type { GitHubProfile } from "./githubOAuth.js";

export type GitHubLinkOutcome = "linked" | "taken" | "only-sign-in";

/** Links a GitHub account to a signed-in account (PRD 14.3); one GitHub account belongs to one Platyko account. */
export async function linkGitHub(userId: string, profile: GitHubProfile): Promise<Exclude<GitHubLinkOutcome, "only-sign-in">> {
  const owner = await prisma.authIdentity.findUnique({ where: { provider_subject: { provider: "GITHUB", subject: profile.subject } }, select: { userId: true } });
  if (owner && owner.userId !== userId) return "taken";
  await prisma.$transaction([
    prisma.authIdentity.upsert({ where: { userId_provider: { userId, provider: "GITHUB" } }, create: { userId, provider: "GITHUB", subject: profile.subject }, update: { subject: profile.subject } }),
    prisma.user.update({ where: { id: userId }, data: { githubLogin: profile.login } }),
  ]);
  return "linked";
}

/**
 * Disconnecting deletes every piece of GitHub data (criterion 20.8). It is refused when GitHub is
 * the account's only way to sign in, which would lock the learner out.
 */
export async function unlinkGitHub(userId: string): Promise<Exclude<GitHubLinkOutcome, "taken">> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { hashedPassword: true, identities: { select: { provider: true } } } });
  const otherWays = user.identities.filter((identity) => identity.provider !== "GITHUB").length + (user.hashedPassword ? 1 : 0);
  if (otherWays === 0) return "only-sign-in";
  await prisma.$transaction([
    prisma.authIdentity.deleteMany({ where: { userId, provider: "GITHUB" } }),
    prisma.user.update({ where: { id: userId }, data: { githubLogin: null, githubPublicRepos: null, githubFollowers: null, githubStatsConsent: false } }),
  ]);
  return "linked";
}
