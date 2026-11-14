import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppLink } from "@/config/appLinks";
import type {
  AnswerResultEvent,
  InviteEvent,
  LobbyEvent,
  MatchEndEvent,
  MatchStartEvent,
  PlaySyncEvent,
  PresenceEvent,
  PresenceStatus,
  ReactionEvent,
  QueueStatusEvent,
  RoundEndEvent,
  RoundProgressEvent,
  RoundStartEvent,
} from "@project/api-contract";

/** A duel invitation this learner sent and is waiting on. */
export type OutgoingInvite = { inviteId: string; username: string; expiresAt: number };

/**
 * Multiplayer as the server tells it (PRD 11.4–11.8). Nothing here is persisted: a game lives on
 * the io server, which sends the whole picture again after a reconnect.
 */
type PlayState = {
  connected: boolean;
  queue: QueueStatusEvent | null;
  lobby: LobbyEvent | null;
  match: MatchStartEvent | null;
  round: RoundStartEvent | null;
  progress: RoundProgressEvent | null;
  lastAnswer: AnswerResultEvent | null;
  roundEnd: RoundEndEvent | null;
  end: MatchEndEvent | null;
  leftUserIds: string[];
  /** The server lost the game the app was showing (it restarted); the Play tab says so once. */
  interrupted: boolean;
  /** Open invitations to this learner, newest first (the inbox, PRD 11.3). */
  invites: InviteEvent[];
  outgoingInvite: OutgoingInvite | null;
  /** Friends who share their status and are not offline. */
  presence: Record<string, PresenceStatus>;
  /** A room or friend link opened before it could be acted on (a guest signs in first). */
  pendingLink: AppLink | null;
  /** Each player's latest reaction in the running game, with when it arrived. */
  reactions: Record<string, { reaction: ReactionEvent["reaction"]; at: number }>;
};

const initialState: PlayState = {
  connected: false,
  queue: null,
  lobby: null,
  match: null,
  round: null,
  progress: null,
  lastAnswer: null,
  roundEnd: null,
  end: null,
  leftUserIds: [],
  interrupted: false,
  invites: [],
  outgoingInvite: null,
  presence: {},
  pendingLink: null,
  reactions: {},
};

/** Leaving a game keeps what belongs to the connection, not to the game, and a room reopened after it. */
const afterGame = (state: PlayState): PlayState => ({ ...initialState, connected: state.connected, invites: state.invites, presence: state.presence, lobby: state.lobby, pendingLink: state.pendingLink });

const playSlice = createSlice({
  name: "play",
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    queueStatus: (state, action: PayloadAction<QueueStatusEvent | null>) => {
      state.queue = action.payload;
      if (action.payload) state.interrupted = false;
    },
    lobbyChanged: (state, action: PayloadAction<LobbyEvent | null>) => {
      state.lobby = action.payload;
      if (action.payload) state.interrupted = false;
    },
    /** After a reconnect: drop a game or room the server no longer holds. */
    syncedWithServer: (state, action: PayloadAction<PlaySyncEvent>) => {
      if (!action.payload.inRoom) state.lobby = null;
      if (!action.payload.inMatch && state.match && !state.end) return { ...afterGame(state), queue: state.queue, interrupted: true };
    },
    /** A new game, or the same one again after a reconnect. */
    matchStarted: (state, action: PayloadAction<MatchStartEvent>) => {
      const sameGame = state.match?.matchId === action.payload.matchId;
      Object.assign(state, { queue: null, lobby: null, match: action.payload, end: null, interrupted: false, outgoingInvite: null }, sameGame ? {} : { round: null, progress: null, lastAnswer: null, roundEnd: null, leftUserIds: [], reactions: {} });
    },
    roundStarted: (state, action: PayloadAction<RoundStartEvent>) => {
      Object.assign(state, { round: action.payload, progress: null, lastAnswer: null, roundEnd: null });
    },
    roundProgress: (state, action: PayloadAction<RoundProgressEvent>) => {
      state.progress = action.payload;
    },
    answerResult: (state, action: PayloadAction<AnswerResultEvent>) => {
      state.lastAnswer = action.payload;
    },
    roundEnded: (state, action: PayloadAction<RoundEndEvent>) => {
      state.roundEnd = action.payload;
    },
    playerLeft: (state, action: PayloadAction<string>) => {
      state.leftUserIds.push(action.payload);
    },
    matchEnded: (state, action: PayloadAction<MatchEndEvent>) => {
      state.end = action.payload;
    },
    /** Back to the Play tab: the finished game is cleared. */
    leavePlay: (state) => afterGame(state),
    /** Sign-out: nothing of the previous account stays. */
    playSignedOut: () => initialState,
    reactionReceived: {
      reducer: (state, action: PayloadAction<ReactionEvent & { at: number }>) => {
        if (action.payload.matchId === state.match?.matchId) state.reactions[action.payload.userId] = { reaction: action.payload.reaction, at: action.payload.at };
      },
      prepare: (event: ReactionEvent) => ({ payload: { ...event, at: Date.now() } }),
    },
    linkOpened: (state, action: PayloadAction<AppLink | null>) => {
      state.pendingLink = action.payload;
    },
    invitesListed: (state, action: PayloadAction<InviteEvent[]>) => {
      state.invites = action.payload;
    },
    inviteReceived: (state, action: PayloadAction<InviteEvent>) => {
      state.invites = [action.payload, ...state.invites.filter((invite) => invite.inviteId !== action.payload.inviteId)];
    },
    /** Answered, cancelled or expired, on either side. */
    inviteClosed: (state, action: PayloadAction<string>) => {
      state.invites = state.invites.filter((invite) => invite.inviteId !== action.payload);
      if (state.outgoingInvite?.inviteId === action.payload) state.outgoingInvite = null;
    },
    outgoingInviteChanged: (state, action: PayloadAction<OutgoingInvite | null>) => {
      state.outgoingInvite = action.payload;
    },
    presenceSnapshot: (state, action: PayloadAction<PresenceEvent[]>) => {
      state.presence = Object.fromEntries(action.payload.map((event) => [event.userId, event.status]));
    },
    presenceUpdated: (state, action: PayloadAction<PresenceEvent>) => {
      if (action.payload.status === "offline") delete state.presence[action.payload.userId];
      else state.presence[action.payload.userId] = action.payload.status;
    },
  },
});

export const {
  reactionReceived,
  linkOpened,
  invitesListed,
  inviteReceived,
  inviteClosed,
  outgoingInviteChanged,
  presenceSnapshot,
  presenceUpdated,
  playSignedOut,
  setConnected,
  queueStatus,
  lobbyChanged,
  syncedWithServer,
  matchStarted,
  roundStarted,
  roundProgress,
  answerResult,
  roundEnded,
  playerLeft,
  matchEnded,
  leavePlay,
} = playSlice.actions;
export default playSlice.reducer;
