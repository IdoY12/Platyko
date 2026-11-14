import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AnswerResultEvent, LobbyEvent, MatchEndEvent, MatchStartEvent, PlaySyncEvent, QueueStatusEvent, RoundEndEvent, RoundProgressEvent, RoundStartEvent } from "@project/api-contract";

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
};

const initialState: PlayState = { connected: false, queue: null, lobby: null, match: null, round: null, progress: null, lastAnswer: null, roundEnd: null, end: null, leftUserIds: [], interrupted: false };

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
      if (!action.payload.inMatch && state.match && !state.end) return { ...initialState, connected: state.connected, queue: state.queue, interrupted: true };
    },
    /** A new game, or the same one again after a reconnect. */
    matchStarted: (state, action: PayloadAction<MatchStartEvent>) => {
      const sameGame = state.match?.matchId === action.payload.matchId;
      Object.assign(state, { queue: null, lobby: null, match: action.payload, end: null, interrupted: false }, sameGame ? {} : { round: null, progress: null, lastAnswer: null, roundEnd: null, leftUserIds: [] });
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
    leavePlay: () => initialState,
  },
});

export const { setConnected, queueStatus, lobbyChanged, syncedWithServer, matchStarted, roundStarted, roundProgress, answerResult, roundEnded, playerLeft, matchEnded, leavePlay } = playSlice.actions;
export default playSlice.reducer;
