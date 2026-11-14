import type { MatchMode, Prisma, PrismaClient } from "@prisma/client";

/** A first place in a finished game; a shared first place is a draw, not a win (PRD 11.5). */
export type FirstPlace = { mode: MatchMode; players: number; shared: boolean };

/** Every game in which the user finished first, ghost seats and cancelled games left out. */
export async function firstPlacesOf(db: PrismaClient | Prisma.TransactionClient, userId: string): Promise<FirstPlace[]> {
  const rows = await db.matchParticipant.findMany({
    where: { userId, isGhost: false, placement: 1, match: { cancelled: false } },
    select: { match: { select: { mode: true, participants: { select: { placement: true } } } } },
  });
  return rows.map(({ match }) => ({ mode: match.mode, players: match.participants.length, shared: match.participants.filter((seat) => seat.placement === 1).length > 1 }));
}
