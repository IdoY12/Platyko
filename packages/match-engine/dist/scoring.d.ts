/**
 * Scoring for every multiplayer mode (PRD 11.5), after Kahoot's documented formula: a right
 * answer earns 500 to 1,000 points by speed, half that on the second attempt, nothing for a
 * wrong or missing answer. Time is measured on the server and forgiven half the player's ping,
 * up to a cap, so a slow connection does not cost points.
 */
export declare const MAX_ATTEMPTS_PER_ROUND = 2;
/** The response time that counts: server time minus half the ping, never below zero. */
export declare function countedResponseMs(serverResponseMs: number, pingMs: number): number;
export declare function pointsForAnswer(answer: {
    correct: boolean;
    attemptNo: number;
    responseMs: number;
    timerMs: number;
}): number;
export type PlayerTotals = {
    playerId: string;
    points: number;
    correct: number;
    correctTimeMs: number;
    left: boolean;
};
export type Placement = PlayerTotals & {
    place: number;
};
/**
 * Final places (PRD 11.5 tie-breakers): points, then right answers, then less time spent on right
 * answers; players still equal share a place. A player who left is ranked after everyone else.
 */
export declare function placements(players: readonly PlayerTotals[]): Placement[];
//# sourceMappingURL=scoring.d.ts.map