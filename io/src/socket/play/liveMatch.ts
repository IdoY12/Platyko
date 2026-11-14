import type { Namespace } from "socket.io";
import type { MatchEndEvent, PlayMode, PlaySeat, Standing } from "@project/api-contract";
import { answerFromPlay, checkItemAnswer, playItemOf, type Item, type ItemAnswer, type OptionOrder, type Track } from "@project/content-model";
import { createMatch, isLastRound, isRoundOver, markLeft, playersRemaining, recordAnswer, roundEndsAt, standings, startNextRound, type MatchState } from "@project/match-engine";
import { revealFor, shuffledOptionOrder, shuffledOutputLines } from "./revealAnswer.js";

/** A recorded player's answers, replayed by a ghost seat (PRD 11.6). */
export type GhostScript = { participantId: string; answers: ({ correct: boolean; responseMs: number } | null)[] };
export type LiveSeat = PlaySeat & { pingMs: number; ghost?: GhostScript };
export type MatchResult = { matchId: string; mode: PlayMode; track: Track; roomCode: string | null; items: Item[]; state: MatchState; seats: LiveSeat[]; startedAt: Date };

const COUNTDOWN_MS = 3000;
const BETWEEN_ROUNDS_MS = 3500;
/** A disconnected player keeps their seat this long; the game does not pause (PRD 11.8). */
const RECONNECT_GRACE_MS = 20_000;

/**
 * One running game: the server's clock decides every round, each player sees options in their
 * own order, the right answer is revealed only when the round ends, and a player who drops out
 * has a grace period before they count as having left.
 */
export class LiveMatch {
  private state: MatchState;
  private optionOrders: OptionOrder[][];
  private timers = new Set<NodeJS.Timeout>();
  private graceTimers = new Map<string, NodeJS.Timeout>();
  private finished = false;
  private readonly startedAt = new Date();

  constructor(
    readonly id: string,
    readonly mode: PlayMode,
    private readonly track: Track,
    readonly seats: LiveSeat[],
    private readonly items: Item[],
    private readonly play: Namespace,
    private readonly roomCode: string | null,
    private readonly onFinish: (result: MatchResult) => Promise<Map<string, Omit<MatchEndEvent, "matchId" | "standings">>>,
  ) {
    this.state = createMatch(seats.map((seat) => ({ id: seat.userId, pingMs: seat.pingMs })), items.map((item) => ({ id: item.id, timeLimitMs: (item.timeLimitSec ?? 30) * 1000 })));
    this.optionOrders = seats.map(() => items.map((item) => shuffledOptionOrder(item)));
  }

  private toUser(userId: string, event: string, payload: unknown): void {
    this.play.to(`user:${userId}`).emit(event, payload);
  }

  private later(delayMs: number, action: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      action();
    }, delayMs);
    this.timers.add(timer);
  }

  private standingsNow(): Standing[] {
    return standings(this.state).map((player) => ({ userId: player.playerId, points: player.points, correct: player.correct, place: player.place, left: player.left }));
  }

  /** Sends the start with a shared countdown timestamp, then the first round when it reaches zero. */
  start(): void {
    const startsAt = Date.now() + COUNTDOWN_MS;
    const ghost = this.seats.find((seat) => seat.isGhost);
    for (const seat of this.seats) this.toUser(seat.userId, "match:start", { matchId: this.id, mode: this.mode, seats: this.seats.map(({ pingMs: _ping, ghost: _ghost, ...shown }) => shown), rounds: this.items.length, startsAt, ghostOf: ghost?.username });
    this.later(COUNTDOWN_MS, () => this.startRound());
  }

  private sendRound(seatIndex: number): void {
    const seat = this.seats[seatIndex];
    const item = this.items[this.state.round];
    const view = playItemOf(item, this.optionOrders[seatIndex][this.state.round], shuffledOutputLines(item));
    this.toUser(seat.userId, "round:start", { matchId: this.id, round: this.state.round, item: view, endsAt: roundEndsAt(this.state) });
  }

  private startRound(): void {
    if (this.finished) return;
    this.state = startNextRound(this.state, Date.now());
    const round = this.state.round;
    this.seats.forEach((seat, index) => (seat.isGhost ? this.scheduleGhost(seat, round) : this.sendRound(index)));
    this.later(this.state.timersMs[round] + 50, () => this.endRound(round));
  }

  private scheduleGhost(seat: LiveSeat, round: number): void {
    const recorded = seat.ghost?.answers[round];
    if (recorded) this.later(recorded.responseMs, () => this.applyAnswer(seat.userId, round, recorded.correct));
  }

  private applyAnswer(userId: string, round: number, correct: boolean): void {
    if (this.finished || round !== this.state.round) return;
    const applied = recordAnswer(this.state, userId, correct, Date.now());
    this.state = applied.state;
    const points = this.state.answers[round][userId]?.points ?? 0;
    this.toUser(userId, "answer:result", { round, outcome: applied.outcome, points });
    const answered = Object.keys(this.state.answers[round]);
    for (const seat of this.seats) this.toUser(seat.userId, "round:progress", { matchId: this.id, round, answeredUserIds: answered });
    if (isRoundOver(this.state, Date.now())) this.endRound(round);
  }

  /** A player's answer, in their own option order; anything malformed or out of turn is ignored. */
  answer(userId: string, round: number, answer: ItemAnswer): void {
    const seatIndex = this.seats.findIndex((seat) => seat.userId === userId && !seat.isGhost);
    if (seatIndex < 0 || round !== this.state.round) return;
    const real = answerFromPlay(answer, this.optionOrders[seatIndex][round]);
    this.applyAnswer(userId, round, real !== null && checkItemAnswer(this.items[round], real).correct);
  }

  private endRound(round: number): void {
    if (this.finished || round !== this.state.round || this.state.roundStartedAt === null) return;
    this.state = { ...this.state, roundStartedAt: null };
    const points = Object.fromEntries(this.seats.map((seat) => [seat.userId, this.state.answers[round][seat.userId]?.points ?? 0]));
    this.seats.forEach((seat, index) => this.toUser(seat.userId, "round:end", { matchId: this.id, round, ...revealFor(this.items[round], this.optionOrders[index][round]), points, standings: this.standingsNow() }));
    if (isLastRound(this.state) || playersRemaining(this.state) < 2) this.later(BETWEEN_ROUNDS_MS, () => void this.finish());
    else this.later(BETWEEN_ROUNDS_MS, () => this.startRound());
  }

  /** A deliberate leave, or a grace period that ran out: ranked last, and the game goes on while two remain. */
  leave(userId: string): void {
    if (this.finished || !this.seats.some((seat) => seat.userId === userId)) return;
    this.state = markLeft(this.state, userId);
    for (const seat of this.seats) this.toUser(seat.userId, "match:player-left", { matchId: this.id, userId });
    const humansLeft = this.state.players.filter((player) => !player.left && !this.seats.find((seat) => seat.userId === player.id)?.isGhost).length;
    if (playersRemaining(this.state) < 2 || humansLeft === 0) void this.finish();
    else if (this.state.roundStartedAt !== null && isRoundOver(this.state, Date.now())) this.endRound(this.state.round);
  }

  disconnected(userId: string): void {
    if (this.finished) return;
    this.graceTimers.set(userId, setTimeout(() => this.leave(userId), RECONNECT_GRACE_MS));
  }

  /** On reconnect the server sends the full picture again; it is the source of truth (PRD 11.8). */
  reconnected(userId: string): void {
    const grace = this.graceTimers.get(userId);
    if (grace) clearTimeout(grace);
    this.graceTimers.delete(userId);
    const seatIndex = this.seats.findIndex((seat) => seat.userId === userId);
    if (seatIndex < 0 || this.finished) return;
    this.toUser(userId, "match:start", { matchId: this.id, mode: this.mode, seats: this.seats.map(({ pingMs: _ping, ghost: _ghost, ...shown }) => shown), rounds: this.items.length, startsAt: this.startedAt.getTime() });
    if (this.state.roundStartedAt !== null) this.sendRound(seatIndex);
    this.toUser(userId, "round:progress", { matchId: this.id, round: this.state.round, answeredUserIds: Object.keys(this.state.answers[this.state.round] ?? {}) });
  }

  private async finish(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    for (const timer of [...this.timers, ...this.graceTimers.values()]) clearTimeout(timer);
    const final = this.standingsNow();
    const rewards = await this.onFinish({ matchId: this.id, mode: this.mode, track: this.track, roomCode: this.roomCode, items: this.items, state: this.state, seats: this.seats, startedAt: this.startedAt });
    for (const seat of this.seats) {
      if (seat.isGhost) continue;
      this.toUser(seat.userId, "match:end", { matchId: this.id, standings: final, ...(rewards.get(seat.userId) ?? { ratingChange: null, xpEarned: 0 }) });
    }
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get userIds(): string[] {
    return this.seats.filter((seat) => !seat.isGhost).map((seat) => seat.userId);
  }
}
