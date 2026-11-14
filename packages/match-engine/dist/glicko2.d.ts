/**
 * Glicko-2 (Glickman, "Example of the Glicko-2 system", public domain; PRD 11.6), for rated
 * two-player games. Ratings are on the Glicko scale (start 1500, deviation 350, volatility 0.06).
 */
export type GlickoRating = {
    rating: number;
    deviation: number;
    volatility: number;
};
/** One game in the rating period: the opponent before the game, and 1 win, 0.5 draw, 0 loss. */
export type GlickoGame = {
    opponent: GlickoRating;
    score: 0 | 0.5 | 1;
};
export declare const INITIAL_RATING: GlickoRating;
/** The player's rating after a rating period with these games. */
export declare function updateRating(player: GlickoRating, games: readonly GlickoGame[]): GlickoRating;
//# sourceMappingURL=glicko2.d.ts.map