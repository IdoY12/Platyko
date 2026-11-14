/**
 * Scoring for every multiplayer mode (PRD 11.5), after Kahoot's documented formula: a right
 * answer earns 500 to 1,000 points by speed, half that on the second attempt, nothing for a
 * wrong or missing answer. Time is measured on the server and forgiven half the player's ping,
 * up to a cap, so a slow connection does not cost points.
 */
export const MAX_ATTEMPTS_PER_ROUND = 2;
const FULL_POINTS = 1000;
const MAX_LATENCY_CREDIT_MS = 250;
/** The response time that counts: server time minus half the ping, never below zero. */
export function countedResponseMs(serverResponseMs, pingMs) {
    return Math.max(0, serverResponseMs - Math.min(pingMs / 2, MAX_LATENCY_CREDIT_MS));
}
export function pointsForAnswer(answer) {
    if (!answer.correct || answer.attemptNo > MAX_ATTEMPTS_PER_ROUND)
        return 0;
    const share = Math.min(1, Math.max(0, answer.responseMs / answer.timerMs));
    const points = Math.round(FULL_POINTS * (1 - share / 2));
    return answer.attemptNo === 1 ? points : Math.round(points / 2);
}
/**
 * Final places (PRD 11.5 tie-breakers): points, then right answers, then less time spent on right
 * answers; players still equal share a place. A player who left is ranked after everyone else.
 */
export function placements(players) {
    const order = (left, right) => Number(left.left) - Number(right.left) || right.points - left.points || right.correct - left.correct || left.correctTimeMs - right.correctTimeMs;
    const sorted = [...players].sort(order);
    return sorted.map((player, index) => {
        const firstEqual = sorted.findIndex((other) => order(other, player) === 0);
        return { ...player, place: (firstEqual === -1 ? index : firstEqual) + 1 };
    });
}
