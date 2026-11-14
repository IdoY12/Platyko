import { prisma, type MatchMode } from "@project/db";
import type { MatchEndEvent } from "@project/api-contract";
import { standings, updateRating } from "@project/match-engine";
import { levelForXp, UNRATED_MATCH_XP_GAMES_PER_DAY, XP_REWARDS } from "@project/xp-constants";
import type { MatchResult } from "./liveMatch.js";

type Reward = Omit<MatchEndEvent, "matchId" | "standings">;

/** A right answer faster than this is flagged for review (PRD 11.9). */
const TOO_FAST_MS = 400;
/** The same two players are rated at most this often a day (PRD 11.9). */
const RATED_PAIR_GAMES_PER_DAY = 3;
const MODE: Record<MatchResult["mode"], MatchMode> = { ranked: "RANKED", friend: "FRIEND", room: "ROOM", ghost: "GHOST" };
const DAY_MS = 24 * 60 * 60 * 1000;

async function ratedTodayBetween(firstId: string, secondId: string): Promise<number> {
  return prisma.match.count({
    where: { mode: "RANKED", endedAt: { gte: new Date(Date.now() - DAY_MS) }, AND: [{ participants: { some: { userId: firstId, ratingAfter: { not: null } } } }, { participants: { some: { userId: secondId } } }] },
  });
}

/** Unrated games that already paid XP today: the cap stops farming between two accounts (PRD 11.4). */
async function paidUnratedToday(userId: string): Promise<number> {
  return prisma.matchParticipant.count({ where: { userId, xpAwarded: { gt: 0 }, match: { mode: { not: "RANKED" }, endedAt: { gte: new Date(Date.now() - DAY_MS) } } } });
}

/**
 * Stores a finished game and pays it out: places and per-round answers, Glicko-2 for a ranked
 * duel between two people, participation and win XP (capped per day outside ranked play), and
 * a review flag for answers too fast to be human. Returns each player's rating change and XP.
 */
export async function persistMatch(result: MatchResult): Promise<Map<string, Reward>> {
  const placed = standings(result.state);
  const humans = result.seats.filter((seat) => !seat.isGhost);
  const users = await prisma.user.findMany({ where: { id: { in: humans.map((seat) => seat.userId) } }, select: { id: true, rating: true, ratingDeviation: true, ratingVolatility: true, xpTotal: true } });
  const ratedDuel = result.mode === "ranked" && humans.length === 2 && (await ratedTodayBetween(humans[0].userId, humans[1].userId)) < RATED_PAIR_GAMES_PER_DAY;
  const rewards = new Map<string, Reward>();
  const ratingAfter = new Map<string, ReturnType<typeof updateRating>>();

  if (ratedDuel) {
    for (const user of users) {
      const opponent = users.find((other) => other.id !== user.id)!;
      const own = placed.find((player) => player.playerId === user.id)!;
      const theirs = placed.find((player) => player.playerId === opponent.id)!;
      const score = own.place < theirs.place ? 1 : own.place > theirs.place ? 0 : 0.5;
      ratingAfter.set(user.id, updateRating({ rating: user.rating, deviation: user.ratingDeviation, volatility: user.ratingVolatility }, [{ opponent: { rating: opponent.rating, deviation: opponent.ratingDeviation, volatility: opponent.ratingVolatility }, score }]));
    }
  }

  for (const user of users) {
    const own = placed.find((player) => player.playerId === user.id)!;
    const capped = result.mode !== "ranked" && (await paidUnratedToday(user.id)) >= UNRATED_MATCH_XP_GAMES_PER_DAY;
    // A win needs points: a game nobody scored in is a draw that pays participation only.
    const won = own.place === 1 && own.points > 0 && result.mode !== "ghost";
    const xpEarned = own.left || capped ? 0 : XP_REWARDS.matchParticipation + (won ? XP_REWARDS.matchWin : 0);
    const rating = ratingAfter.get(user.id);
    rewards.set(user.id, { xpEarned, ratingChange: rating ? Math.round(rating.rating - user.rating) : null });
  }

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.create({
      data: { mode: MODE[result.mode], track: result.track, rounds: result.items.length, itemIds: result.items.map((item) => item.id), roomCode: result.roomCode, startedAt: result.startedAt, endedAt: new Date() },
    });
    for (const [seatIndex, seat] of result.seats.entries()) {
      const own = placed.find((player) => player.playerId === seat.userId)!;
      const answers = result.state.answers.map((round) => round[seat.userId] ?? null);
      const before = users.find((user) => user.id === seat.userId);
      const rating = ratingAfter.get(seat.userId);
      await tx.matchParticipant.create({
        data: {
          matchId: match.id, userId: seat.isGhost ? null : seat.userId, seat: seatIndex, placement: own.place, score: own.points, correctCount: own.correct, correctTimeMs: own.correctTimeMs,
          answers, left: own.left, isGhost: seat.isGhost, ghostSourceParticipantId: seat.ghost?.participantId ?? null,
          ratingBefore: rating ? before!.rating : null, ratingAfter: rating?.rating ?? null, xpAwarded: rewards.get(seat.userId)?.xpEarned ?? 0,
        },
      });
      const tooFast = answers.filter((answer) => answer?.correct && answer.responseMs < TOO_FAST_MS);
      if (!seat.isGhost && tooFast.length > 0) await tx.antiCheatFlag.create({ data: { userId: seat.userId, matchId: match.id, kind: "too-fast", detail: { answers: tooFast.length } } });
    }
    for (const user of users) {
      const rating = ratingAfter.get(user.id);
      const xpTotal = user.xpTotal + (rewards.get(user.id)?.xpEarned ?? 0);
      await tx.user.update({
        where: { id: user.id },
        data: { xpTotal, level: levelForXp(xpTotal), ...(rating ? { rating: rating.rating, ratingDeviation: rating.deviation, ratingVolatility: rating.volatility, ratedGamesPlayed: { increment: 1 } } : {}) },
      });
    }
  });
  return rewards;
}
