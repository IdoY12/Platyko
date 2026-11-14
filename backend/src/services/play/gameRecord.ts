import type { GameRecordResponse, PlayMode, RecentGame } from "@project/api-contract";
import { firstPlacesOf, prisma, type MatchMode, type MatchVariant } from "@project/db";
import { PLACEMENT_GAMES, type GameVariant } from "@project/match-engine";

const RECENT_GAMES = 10;
const MODE: Record<MatchMode, PlayMode> = { RANKED: "ranked", FRIEND: "friend", ROOM: "room", GHOST: "ghost" };
/** Reverse has no games yet (decision A33); it reads as classic until it does. */
const VARIANT: Record<MatchVariant, GameVariant> = { CLASSIC: "classic", BUG_HUNT: "bug-hunt", OUTPUT_RACE: "output-race", REVERSE: "classic" };

/**
 * A learner's games for their profile (PRD 14.1): the rating once placed, wins, losses and draws
 * (a shared first place is a draw; practice against a recording counts for nothing, PRD 11.6),
 * and the last games with their opponents.
 */
export async function gameRecordOf(userId: string): Promise<GameRecordResponse> {
  const [user, played, firstPlaces, recent] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { rating: true, ratedGamesPlayed: true } }),
    prisma.matchParticipant.count({ where: { userId, isGhost: false, match: { cancelled: false, mode: { not: "GHOST" } } } }),
    firstPlacesOf(prisma, userId),
    prisma.matchParticipant.findMany({
      where: { userId, isGhost: false, match: { cancelled: false } },
      orderBy: { match: { endedAt: "desc" } },
      take: RECENT_GAMES,
      select: {
        placement: true,
        score: true,
        match: { select: { id: true, mode: true, variant: true, endedAt: true, participants: { select: { userId: true, isGhost: true, user: { select: { username: true } }, ghostSource: { select: { user: { select: { username: true } } } } } } } },
      },
    }),
  ]);
  const counted = firstPlaces.filter((first) => first.mode !== "GHOST");
  const wins = counted.filter((first) => !first.shared).length;
  const draws = counted.length - wins;
  const placed = user.ratedGamesPlayed >= PLACEMENT_GAMES;
  return {
    rating: placed ? Math.round(user.rating) : null,
    placementGamesLeft: Math.max(PLACEMENT_GAMES - user.ratedGamesPlayed, 0),
    wins,
    draws,
    losses: played - wins - draws,
    recent: recent.map((game): RecentGame => ({
      matchId: game.match.id,
      mode: MODE[game.match.mode],
      variant: VARIANT[game.match.variant],
      endedAt: game.match.endedAt.toISOString(),
      place: game.placement,
      players: game.match.participants.length,
      points: game.score,
      // A recording is shown under the name of the player it replays.
      opponents: game.match.participants.filter((seat) => seat.userId !== userId).map((seat) => (seat.isGhost ? seat.ghostSource?.user?.username : seat.user?.username) ?? null),
    })),
  };
}
