/**
 * Ranked play (PRD 11.6): river-themed tiers for the shown rating, the widening search window,
 * and when a ghost opponent is offered.
 */

export const PLACEMENT_GAMES = 5;
export const TIERS = ["stream", "creek", "river", "rapids", "delta", "ocean"] as const;
export type Tier = (typeof TIERS)[number];
/** The lowest rating of each tier after the first. */
const TIER_FLOORS = [1300, 1450, 1600, 1750, 1900];

export function tierOf(rating: number): Tier {
  return TIERS[TIER_FLOORS.filter((floor) => rating >= floor).length];
}

const START_WINDOW = 100;
const WIDEN_BY = 50;
const WIDEN_EVERY_MS = 5000;
/** A ghost opponent is offered after this long without a match. */
export const GHOST_OFFER_AFTER_MS = 25_000;

/** How far, in rating points either way, a player who has waited `waitedMs` may be matched. */
export function searchWindow(waitedMs: number): number {
  return START_WINDOW + WIDEN_BY * Math.floor(waitedMs / WIDEN_EVERY_MS);
}

/** Two waiting players match when each is inside the other's window and neither blocked the other. */
export function canMatch(first: { rating: number; waitedMs: number }, second: { rating: number; waitedMs: number }, blockedEitherWay: boolean): boolean {
  const gap = Math.abs(first.rating - second.rating);
  return !blockedEitherWay && gap <= searchWindow(first.waitedMs) && gap <= searchWindow(second.waitedMs);
}
