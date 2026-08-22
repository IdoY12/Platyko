import type { DefaultEventsMap, Namespace, Server, Socket } from "socket.io";

export type DuelServer = Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, DuelSocketData>;

/** Socket state set by attachDuelConnectionAuthentication after JWT verification. */
export interface DuelSocketData {
  authenticatedUserId?: string;
}

export interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: number;
}

export interface CachedQuestion {
  id: string;
  correctAnswer: string;
  explanation: string | null;
}

export interface SessionState {
  sessionId: string;
  roomId: string;
  player1: QueueEntry;
  player2: QueueEntry;
  score: { player1: number; player2: number };
  round: number;
  readyUserIds: Set<string>;
  currentQuestionId: string | null;
  /** Cached to avoid redundant DB queries on each answer submission. */
  currentQuestion: CachedQuestion | null;
  answered: boolean;
  player1Attempts: number;
  player2Attempts: number;
  roundReplay: Array<{
    roundNumber: number;
    winnerUserId: string | null;
    correctAnswer: string;
    player1TimeMs: number;
    player2TimeMs: number;
  }>;
  /** Client local YYYY-MM-DD for streak when granting duel XP. */
  player1StreakLocalDate: string | null;
  player2StreakLocalDate: string | null;
  /** XP persisted during this duel for each slot (for duel_end client sync). */
  xpGrantedP1: number;
  xpGrantedP2: number;
  abandonInProgress?: boolean;
  askedQuestionIds: Set<string>;
  /** Pending ready/round timeout; cleared on session end or abandon (see roundTimeout.ts). */
  roundTimer?: ReturnType<typeof setTimeout>;
  /** Absolute epoch ms when the running round times out; mirrors roundTimer so clients can render a synced countdown. */
  roundDeadlineAt?: number;
}

export type DuelNamespace = Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, DuelSocketData>;

export type DuelSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, DuelSocketData>;
