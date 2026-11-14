import { prisma } from "@project/db";
import { PLACEMENT_GAMES, tierOf } from "@project/match-engine";
import { loadContentMap } from "../content/contentCatalog.js";
import type { BadgeFacts } from "./badgeSvg.js";

/** Badge names stay English: a README is read outside the app. */
const TRACK_NAME = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert" } as const;
const tierName = (tier: string) => tier.charAt(0).toUpperCase() + tier.slice(1);

/**
 * The facts for a user's README badge (PRD 14.3), or null unless they turned the badge on. The
 * track is the one of their latest finished lesson, or the one they started on.
 */
export async function badgeFactsFor(username: string): Promise<BadgeFacts | null> {
  const user = await prisma.user.findFirst({
    where: { usernameLower: username.toLowerCase(), readmeBadgeEnabled: true },
    select: { id: true, username: true, streakCurrent: true, startingTrack: true, rating: true, ratedGamesPlayed: true },
  });
  if (!user) return null;
  const [latest, map] = await Promise.all([
    prisma.lessonCompletion.findFirst({ where: { userId: user.id }, orderBy: { lastCompletedAt: "desc" }, select: { lessonId: true } }),
    loadContentMap(),
  ]);
  const track = map.units.find((unit) => unit.lessons.some((lesson) => lesson.id === latest?.lessonId))?.track ?? user.startingTrack ?? "BEGINNER";
  return {
    username: user.username,
    track: TRACK_NAME[track],
    tier: user.ratedGamesPlayed >= PLACEMENT_GAMES ? tierName(tierOf(user.rating)) : null,
    streak: user.streakCurrent,
  };
}
