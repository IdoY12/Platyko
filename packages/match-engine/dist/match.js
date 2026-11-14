import { countedResponseMs, MAX_ATTEMPTS_PER_ROUND, placements, pointsForAnswer } from "./scoring.js";
export function createMatch(players, items) {
    return {
        players: players.map((player) => ({ ...player, left: false })),
        itemIds: items.map((item) => item.id),
        timersMs: items.map((item) => item.timeLimitMs),
        round: -1,
        roundStartedAt: null,
        answers: items.map(() => ({})),
    };
}
export function startNextRound(state, now) {
    return { ...state, round: state.round + 1, roundStartedAt: now };
}
export function roundEndsAt(state) {
    return state.roundStartedAt === null ? null : state.roundStartedAt + state.timersMs[state.round];
}
const isDone = (answer) => answer !== undefined && (answer.correct || answer.attempts >= MAX_ATTEMPTS_PER_ROUND);
/** Records one attempt. A third attempt, an answer after the timer or from a player who left is closed. */
export function recordAnswer(state, playerId, correct, now) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    const endsAt = roundEndsAt(state);
    const previous = state.answers[state.round]?.[playerId];
    if (!player || player.left || endsAt === null || now > endsAt || isDone(previous))
        return { state, outcome: "closed" };
    const attempts = (previous?.attempts ?? 0) + 1;
    const responseMs = countedResponseMs(now - (state.roundStartedAt ?? now), player.pingMs);
    const points = pointsForAnswer({ correct, attemptNo: attempts, responseMs, timerMs: state.timersMs[state.round] });
    const answers = state.answers.map((round, index) => (index === state.round ? { ...round, [playerId]: { attempts, correct, responseMs, points } } : round));
    const outcome = correct ? "correct" : attempts < MAX_ATTEMPTS_PER_ROUND ? "retry" : "wrong";
    return { state: { ...state, answers }, outcome };
}
/** The round is over when its timer ran out or every player still in the game is done. */
export function isRoundOver(state, now) {
    const endsAt = roundEndsAt(state);
    if (endsAt === null)
        return false;
    return now >= endsAt || state.players.filter((player) => !player.left).every((player) => isDone(state.answers[state.round][player.id]));
}
export function isLastRound(state) {
    return state.round >= state.itemIds.length - 1;
}
/** A leaver is ranked last; the game goes on while two players remain (PRD 11.8). */
export function markLeft(state, playerId) {
    return { ...state, players: state.players.map((player) => (player.id === playerId ? { ...player, left: true } : player)) };
}
export function playersRemaining(state) {
    return state.players.filter((player) => !player.left).length;
}
/** Points, right answers and time on right answers so far, placed with the PRD tie-breakers. */
export function standings(state) {
    return placements(state.players.map((player) => {
        const own = state.answers.map((round) => round[player.id]).filter((answer) => answer !== undefined);
        const right = own.filter((answer) => answer.correct);
        return { playerId: player.id, points: own.reduce((sum, answer) => sum + answer.points, 0), correct: right.length, correctTimeMs: right.reduce((sum, answer) => sum + answer.responseMs, 0), left: player.left };
    }));
}
