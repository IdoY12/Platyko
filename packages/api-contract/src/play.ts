import type { ItemAnswer, PlayItem, Track } from "@project/content-model";
import type { GameVariant } from "@project/match-engine";

/**
 * The `/play` Socket.IO namespace (PRD 11.4–11.9), shared by the io server and the app. The server
 * owns the clock and the answers: a client sends what the player chose and receives outcomes,
 * standings and, only when a round ends, the right answer.
 */

/** `friend`: a two-player game started by accepting a friend's invitation (PRD 11.4). */
export type PlayMode = "ranked" | "friend" | "room" | "ghost";

/** One player as every other player in the game sees them. */
export type PlaySeat = { userId: string; username: string; avatarUrl: string | null; level: number; isGhost: boolean };

export type Standing = { userId: string; points: number; correct: number; place: number; left: boolean };

export type MatchStartEvent = { matchId: string; mode: PlayMode; variant: GameVariant; track: Track; seats: PlaySeat[]; rounds: number; startsAt: number; ghostOf?: string };
export type RoundStartEvent = { matchId: string; round: number; item: PlayItem; endsAt: number };
/** Who has answered so far, never whether they were right (PRD 11.7). */
export type RoundProgressEvent = { matchId: string; round: number; answeredUserIds: string[] };
/** `responseMs`: this answer's time as the server measured it, shown with the points (PRD 11.5). */
export type AnswerResultEvent = { round: number; outcome: "correct" | "retry" | "wrong" | "closed"; points: number; responseMs: number | null };
/** The round's right answer, in this player's option order, and everyone's points for it. */
export type RoundEndEvent = { matchId: string; round: number; rightOptionIndex: number | null; rightText: string | null; points: Record<string, number>; standings: Standing[] };
export type MatchEndEvent = { matchId: string; standings: Standing[]; ratingChange: number | null; xpEarned: number };

/** Sent on every connection: what the server still holds for this player (it forgets all on a restart). */
export type PlaySyncEvent = { inMatch: boolean; inRoom: boolean };
export type QueueStatusEvent = { searching: boolean; waitedMs: number; ghostOffered: boolean };
export type LobbyEvent = {
  code: string;
  hostId: string;
  track: Track;
  variant: GameVariant;
  rounds: number;
  maxPlayers: number;
  players: (PlaySeat & { ready: boolean })[];
};

/** The only in-game communication (PRD 11.2): six preset reactions, no free text. */
export const REACTIONS = ["wave", "nice", "wow", "think", "oops", "gg"] as const;
export type Reaction = (typeof REACTIONS)[number];
export type ReactionEvent = { matchId: string; userId: string; reaction: Reaction };

/** Presence (PRD 11.3): sent to friends only, and only when it changes. */
export type PresenceStatus = "online" | "in-game" | "offline";
export type PresenceEvent = { userId: string; status: PresenceStatus };

/** A game invitation (PRD 11.3): a duel expires after 60 seconds, a room one when the lobby closes. */
export type InviteKind = "duel" | "room";
export type InviteEvent = { inviteId: string; kind: InviteKind; from: PlaySeat; track: Track; roomCode: string | null; expiresAt: number };
/** An invitation that was answered, cancelled or expired; both sides drop it. */
export type InviteClosedEvent = { inviteId: string };

/** Client to server. */
export type JoinQueueRequest = { track: Track };
export type SubmitPlayAnswer = { matchId: string; round: number; answer: ItemAnswer };
export type CreateRoomRequest = { track: Track; variant: GameVariant; rounds: number; maxPlayers: number };
export type JoinRoomRequest = { code: string };
export type InviteDuelRequest = { userId: string; track: Track };
export type InviteToRoomRequest = { userId: string };
export type AnswerInviteRequest = { inviteId: string; accept: boolean };

/** One finished game on a profile (PRD 14.1); an opponent whose account is gone is null. */
export type RecentGame = { matchId: string; mode: PlayMode; variant: GameVariant; endedAt: string; place: number; players: number; points: number; opponents: (string | null)[] };
/**
 * `GET /api/user/game-record`: the rating once the placement games are played (null before), the
 * record without practice games against recordings, and the last 10 games.
 */
export type GameRecordResponse = { rating: number | null; placementGamesLeft: number; wins: number; losses: number; draws: number; recent: RecentGame[] };

/** `GET /api/user/achievements`: the badges the server recorded (games and Friend Streaks among them). */
export type AchievementsResponse = { codes: string[] };

/** Why a play request was refused; the app shows each in the UI language. */
export const PLAY_ERRORS = ["room-not-found", "room-full", "room-started", "not-host", "not-enough-players", "in-another-game", "cooldown", "cannot-invite", "invite-gone", "friend-busy"] as const;
export type PlayError = (typeof PLAY_ERRORS)[number];
