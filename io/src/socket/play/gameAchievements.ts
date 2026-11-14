import { firstPlacesOf, type Prisma } from "@project/db";
import { earnedAchievements, playFacts } from "@project/learning-logic";
import { PLACEMENT_GAMES, TIERS, tierOf } from "@project/match-engine";

/** A room of this many players won outright earns its own badge (PRD 14.2). */
const FULL_ROOM = 4;

/**
 * Records the competition badges a finished game may have earned (PRD 14.2): ranked wins, the
 * ranked tier reached once placed, and a full room won outright. Badges are only ever added.
 */
export async function recordGameAchievements(tx: Prisma.TransactionClient, userId: string, rating: number, ratedGamesPlayed: number): Promise<void> {
  const firstPlaces = (await firstPlacesOf(tx, userId)).filter((first) => !first.shared);
  const facts = playFacts({
    rankedWins: firstPlaces.filter((first) => first.mode === "RANKED").length,
    bestTier: ratedGamesPlayed >= PLACEMENT_GAMES ? TIERS.indexOf(tierOf(rating)) : 0,
    bigRoomWins: firstPlaces.filter((first) => first.mode === "ROOM" && first.players === FULL_ROOM).length,
    bestFriendStreak: 0,
  });
  const codes = earnedAchievements(facts);
  if (codes.length > 0) await tx.achievement.createMany({ data: codes.map((code) => ({ userId, code })), skipDuplicates: true });
}

