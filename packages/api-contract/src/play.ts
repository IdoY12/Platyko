import type { ItemAnswer, PlayItem, Track } from "@project/content-model";

/**
 * The `/play` Socket.IO namespace (PRD 11.4–11.9), shared by the io server and the app. The server
 * owns the clock and the answers: a client sends what the player chose and receives outcomes,
 * standings and, only when a round ends, the right answer.
 */

export type PlayMode = "ranked" | "room" | "ghost";

/** One player as every other player in the game sees them. */
export type PlaySeat = { userId: string; username: string; avatarUrl: string | null; level: number; isGhost: boolean };

export type Standing = { userId: string; points: number; correct: number; place: number; left: boolean };

export type MatchStartEvent = { matchId: string; mode: PlayMode; seats: PlaySeat[]; rounds: number; startsAt: number; ghostOf?: string };
export type RoundStartEvent = { matchId: string; round: number; item: PlayItem; endsAt: number };
/** Who has answered so far, never whether they were right (PRD 11.7). */
export type RoundProgressEvent = { matchId: string; round: number; answeredUserIds: string[] };
export type AnswerResultEvent = { round: number; outcome: "correct" | "retry" | "wrong" | "closed"; points: number };
/** The round's right answer, in this player's option order, and everyone's points for it. */
export type RoundEndEvent = { matchId: string; round: number; rightOptionIndex: number | null; rightText: string | null; points: Record<string, number>; standings: Standing[] };
export type MatchEndEvent = { matchId: string; standings: Standing[]; ratingChange: number | null; xpEarned: number };

export type QueueStatusEvent = { searching: boolean; waitedMs: number; ghostOffered: boolean };
export type LobbyEvent = {
  code: string;
  hostId: string;
  track: Track;
  rounds: number;
  maxPlayers: number;
  players: (PlaySeat & { ready: boolean })[];
};

/** Client to server. */
export type JoinQueueRequest = { track: Track };
export type SubmitPlayAnswer = { matchId: string; round: number; answer: ItemAnswer };
export type CreateRoomRequest = { track: Track; rounds: number; maxPlayers: number };
export type JoinRoomRequest = { code: string };

/** Why a play request was refused; the app shows each in the UI language. */
export const PLAY_ERRORS = ["room-not-found", "room-full", "room-started", "not-host", "not-enough-players", "in-another-game", "cooldown"] as const;
export type PlayError = (typeof PLAY_ERRORS)[number];
