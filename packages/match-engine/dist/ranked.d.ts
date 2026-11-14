/**
 * Ranked play (PRD 11.6): river-themed tiers for the shown rating, the widening search window,
 * and when a ghost opponent is offered.
 */
export declare const PLACEMENT_GAMES = 5;
export declare const TIERS: readonly ["stream", "creek", "river", "rapids", "delta", "ocean"];
export type Tier = (typeof TIERS)[number];
export declare function tierOf(rating: number): Tier;
/** A ghost opponent is offered after this long without a match. */
export declare const GHOST_OFFER_AFTER_MS = 25000;
/** How far, in rating points either way, a player who has waited `waitedMs` may be matched. */
export declare function searchWindow(waitedMs: number): number;
/** Two waiting players match when each is inside the other's window and neither blocked the other. */
export declare function canMatch(first: {
    rating: number;
    waitedMs: number;
}, second: {
    rating: number;
    waitedMs: number;
}, blockedEitherWay: boolean): boolean;
//# sourceMappingURL=ranked.d.ts.map