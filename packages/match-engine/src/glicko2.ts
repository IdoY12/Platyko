/**
 * Glicko-2 (Glickman, "Example of the Glicko-2 system", public domain; PRD 11.6), for rated
 * two-player games. Ratings are on the Glicko scale (start 1500, deviation 350, volatility 0.06).
 */

export type GlickoRating = { rating: number; deviation: number; volatility: number };
/** One game in the rating period: the opponent before the game, and 1 win, 0.5 draw, 0 loss. */
export type GlickoGame = { opponent: GlickoRating; score: 0 | 0.5 | 1 };

export const INITIAL_RATING: GlickoRating = { rating: 1500, deviation: 350, volatility: 0.06 };
const SCALE = 173.7178;
/** System constant: how fast volatility may change. 0.5 is in the range the paper recommends. */
const TAU = 0.5;
const CONVERGENCE = 0.000001;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu: number, muOpponent: number, phiOpponent: number) => 1 / (1 + Math.exp(-g(phiOpponent) * (mu - muOpponent)));

/** The new volatility, by the Illinois algorithm (step 5 of the paper). */
function newVolatility(phi: number, sigma: number, variance: number, delta: number): number {
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - variance - ex)) / (2 * (phi * phi + variance + ex) ** 2) - (x - a) / (TAU * TAU);
  };
  let upper = a;
  let lower: number;
  if (delta * delta > phi * phi + variance) lower = Math.log(delta * delta - phi * phi - variance);
  else {
    let k = 1;
    while (f(a - k * TAU) < 0) k += 1;
    lower = a - k * TAU;
  }
  let fUpper = f(upper);
  let fLower = f(lower);
  while (Math.abs(lower - upper) > CONVERGENCE) {
    const middle = upper + ((upper - lower) * fUpper) / (fLower - fUpper);
    const fMiddle = f(middle);
    if (fMiddle * fLower <= 0) {
      upper = lower;
      fUpper = fLower;
    } else fUpper /= 2;
    lower = middle;
    fLower = fMiddle;
  }
  return Math.exp(upper / 2);
}

/** The player's rating after a rating period with these games. */
export function updateRating(player: GlickoRating, games: readonly GlickoGame[]): GlickoRating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.deviation / SCALE;
  if (games.length === 0) return { ...player, deviation: Math.min(INITIAL_RATING.deviation, Math.sqrt(phi * phi + player.volatility * player.volatility) * SCALE) };
  const scaled = games.map((game) => ({ mu: (game.opponent.rating - 1500) / SCALE, phi: game.opponent.deviation / SCALE, score: game.score }));
  const variance = 1 / scaled.reduce((sum, game) => sum + g(game.phi) ** 2 * expected(mu, game.mu, game.phi) * (1 - expected(mu, game.mu, game.phi)), 0);
  const improvement = scaled.reduce((sum, game) => sum + g(game.phi) * (game.score - expected(mu, game.mu, game.phi)), 0);
  const sigma = newVolatility(phi, player.volatility, variance, variance * improvement);
  const phiStar = Math.sqrt(phi * phi + sigma * sigma);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / variance);
  const muNew = mu + phiNew * phiNew * improvement;
  return { rating: 1500 + SCALE * muNew, deviation: SCALE * phiNew, volatility: sigma };
}
