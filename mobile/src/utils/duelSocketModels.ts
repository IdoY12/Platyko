/**
 * `duelConnectionRefs` holds runtime connection state: the active Socket.IO client, the `userId` associated with
 * queue joins, and `lastAuthTokenKey` for reconnect deduplication. These values are not stored in Redux for three
 * reasons: (1) `Socket` is a non-serializable class instance and would violate Redux Toolkit serialization rules and
 * any persistence layer. (2) They do not need to drive React re-renders; putting them in the store would add dispatch
 * churn without UI benefit. (3) They are module-scoped transport plumbing, not render state.
 *
 * Any new runtime connection handle (reconnect timer id, heartbeat handle, transport flag) belongs here, not in the
 * `duelLive` slice. Everything a component renders from belongs in `duelLive` instead. Keep those two lanes separate.
 */
import type { Socket } from "socket.io-client";

export interface DuelRound {
  roundNumber: number;
  prompt: string;
  codeSnippet: string;
  options: string[];
  type: "MCQ" | "PUZZLE";
}

/** Line-tap answers for seeded bug questions stay `MCQ`; infer from prompt and numeric line options. */
function isDuelLineTapRound(prompt: string, codeSnippet: string, options: string[]): boolean {
  const lines = codeSnippet.split("\n");
  if (lines.length < 2 || options.length === 0) return false;
  const allLineNumbers = options.every((option) => {
    const trimmed = option.trim();
    return /^\d+$/.test(trimmed) && Number(trimmed) >= 1 && Number(trimmed) <= lines.length;
  });
  return allLineNumbers && /line|bug/i.test(prompt);
}

export function duelRoundUsesLinePick(round: DuelRound): boolean {
  return round.type === "MCQ" && isDuelLineTapRound(round.prompt, round.codeSnippet, round.options);
}

export interface DuelReplayRow {
  roundNumber: number;
  winnerUserId: string | null;
  correctAnswer: string;
  player1TimeMs: number;
  player2TimeMs: number;
}

export const duelConnectionRefs = {
  socket: null as Socket | null,
  lastAuthTokenKey: "__init__",
  userId: null as string | null,
};

type ReplayRaw = {
  roundNumber?: number;
  round_number?: number;
  winnerUserId?: string;
  winner_user_id?: string | null;
  correctAnswer?: string;
  correct_answer?: string;
  player1TimeMs?: number;
  player1_ms?: number;
  player2TimeMs?: number;
  player2_ms?: number;
};
export function normalizeDuelReplayEntry(entry: unknown): DuelReplayRow {
  const e = entry as ReplayRaw;
  return {
    roundNumber: Number(e.roundNumber ?? e.round_number ?? 0),
    winnerUserId: typeof e.winnerUserId === "string" ? e.winnerUserId : e.winner_user_id ?? null,
    correctAnswer: String(e.correctAnswer ?? e.correct_answer ?? ""),
    player1TimeMs: Number(e.player1TimeMs ?? e.player1_ms ?? 0),
    player2TimeMs: Number(e.player2TimeMs ?? e.player2_ms ?? 0),
  };
}
