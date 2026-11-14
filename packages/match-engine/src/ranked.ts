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

/** Leaving ranked games (PRD 11.8): from the third leave in a day, a queue cooldown that doubles with each one. */
const LEAVES_BEFORE_COOLDOWN = 3;
const FIRST_COOLDOWN_MS = 5 * 60_000;
export const LEAVE_WINDOW_MS = 24 * 60 * 60_000;

/** How long after the latest leave the player waits to queue again, given their leaves in the last day. */
export function leaverCooldownMs(leavesInWindow: number): number {
  return leavesInWindow < LEAVES_BEFORE_COOLDOWN ? 0 : FIRST_COOLDOWN_MS * 2 ** (leavesInWindow - LEAVES_BEFORE_COOLDOWN);
}
