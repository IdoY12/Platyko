import { countedResponseMs, MAX_ATTEMPTS_PER_ROUND, placements, pointsForAnswer, type Placement } from "./scoring.js";

/**
 * One match as plain data (PRD 11.4, 11.5, 11.8): the same rules for a duel and a room of four.
 * The server owns the clock: every function takes `now` in milliseconds, and an answer's time is
 * measured from when the round started on the server. Answers are checked by the caller.
 */

export type MatchPlayer = { id: string; pingMs: number; left: boolean };
export type RoundAnswer = { attempts: number; correct: boolean; responseMs: number; points: number };
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

export function createMatch(players: readonly { id: string; pingMs: number }[], items: readonly { id: string; timeLimitMs: number }[]): MatchState {
  return {
    players: players.map((player) => ({ ...player, left: false })),
    itemIds: items.map((item) => item.id),
    timersMs: items.map((item) => item.timeLimitMs),
    round: -1,
    roundStartedAt: null,
    answers: items.map(() => ({})),
  };
}

export function startNextRound(state: MatchState, now: number): MatchState {
  return { ...state, round: state.round + 1, roundStartedAt: now };
}

export function roundEndsAt(state: MatchState): number | null {
  return state.roundStartedAt === null ? null : state.roundStartedAt + state.timersMs[state.round];
}

const isDone = (answer: RoundAnswer | undefined) => answer !== undefined && (answer.correct || answer.attempts >= MAX_ATTEMPTS_PER_ROUND);

/** Records one attempt. A third attempt, an answer after the timer or from a player who left is closed. */
export function recordAnswer(state: MatchState, playerId: string, correct: boolean, now: number): { state: MatchState; outcome: AnswerOutcome } {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const endsAt = roundEndsAt(state);
  const previous = state.answers[state.round]?.[playerId];
  if (!player || player.left || endsAt === null || now > endsAt || isDone(previous)) return { state, outcome: "closed" };
  const attempts = (previous?.attempts ?? 0) + 1;
  const responseMs = countedResponseMs(now - (state.roundStartedAt ?? now), player.pingMs);
  const points = pointsForAnswer({ correct, attemptNo: attempts, responseMs, timerMs: state.timersMs[state.round] });
  const answers = state.answers.map((round, index) => (index === state.round ? { ...round, [playerId]: { attempts, correct, responseMs, points } } : round));
  const outcome: AnswerOutcome = correct ? "correct" : attempts < MAX_ATTEMPTS_PER_ROUND ? "retry" : "wrong";
  return { state: { ...state, answers }, outcome };
}

/** The round is over when its timer ran out or every player still in the game is done. */
export function isRoundOver(state: MatchState, now: number): boolean {
  const endsAt = roundEndsAt(state);
  if (endsAt === null) return false;
  return now >= endsAt || state.players.filter((player) => !player.left).every((player) => isDone(state.answers[state.round][player.id]));
}

export function isLastRound(state: MatchState): boolean {
  return state.round >= state.itemIds.length - 1;
}

/** A leaver is ranked last; the game goes on while two players remain (PRD 11.8). */
export function markLeft(state: MatchState, playerId: string): MatchState {
  return { ...state, players: state.players.map((player) => (player.id === playerId ? { ...player, left: true } : player)) };
}

export function playersRemaining(state: MatchState): number {
  return state.players.filter((player) => !player.left).length;
}

/** Points, right answers and time on right answers so far, placed with the PRD tie-breakers. */
export function standings(state: MatchState): Placement[] {
  return placements(
    state.players.map((player) => {
      const own = state.answers.map((round) => round[player.id]).filter((answer): answer is RoundAnswer => answer !== undefined);
      const right = own.filter((answer) => answer.correct);
      return { playerId: player.id, points: own.reduce((sum, answer) => sum + answer.points, 0), correct: right.length, correctTimeMs: right.reduce((sum, answer) => sum + answer.responseMs, 0), left: player.left };
    }),
  );
}
