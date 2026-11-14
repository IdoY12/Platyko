import { type Placement } from "./scoring.js";
/**
 * One match as plain data (PRD 11.4, 11.5, 11.8): the same rules for a duel and a room of four.
 * The server owns the clock: every function takes `now` in milliseconds, and an answer's time is
 * measured from when the round started on the server. Answers are checked by the caller.
 */
export type MatchPlayer = {
    id: string;
    pingMs: number;
    left: boolean;
};
export type RoundAnswer = {
    attempts: number;
    correct: boolean;
    responseMs: number;
    points: number;
};
export type MatchState = {
    players: MatchPlayer[];
    itemIds: string[];
    /** Answer time allowed per round, from each item's duel time limit. */
    timersMs: number[];
    /** -1 before the first round. */
    round: number;
    roundStartedAt: number | null;
    /** Per round, per player. */
    answers: Record<string, RoundAnswer>[];
};
export type AnswerOutcome = "correct" | "retry" | "wrong" | "closed";
export declare function createMatch(players: readonly {
    id: string;
    pingMs: number;
}[], items: readonly {
    id: string;
    timeLimitMs: number;
}[]): MatchState;
export declare function startNextRound(state: MatchState, now: number): MatchState;
export declare function roundEndsAt(state: MatchState): number | null;
/** Records one attempt. A third attempt, an answer after the timer or from a player who left is closed. */
export declare function recordAnswer(state: MatchState, playerId: string, correct: boolean, now: number): {
    state: MatchState;
    outcome: AnswerOutcome;
};
/** The round is over when its timer ran out or every player still in the game is done. */
export declare function isRoundOver(state: MatchState, now: number): boolean;
export declare function isLastRound(state: MatchState): boolean;
/** A leaver is ranked last; the game goes on while two players remain (PRD 11.8). */
export declare function markLeft(state: MatchState, playerId: string): MatchState;
export declare function playersRemaining(state: MatchState): number;
/** Points, right answers and time on right answers so far, placed with the PRD tie-breakers. */
export declare function standings(state: MatchState): Placement[];
//# sourceMappingURL=match.d.ts.map