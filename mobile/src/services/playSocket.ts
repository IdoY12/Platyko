import { io, type Socket } from "socket.io-client";
import type {
  AnswerResultEvent,
  CreateRoomRequest,
  LobbyEvent,
  MatchEndEvent,
  MatchStartEvent,
  PlayError,
  PlaySyncEvent,
  QueueStatusEvent,
  RoundEndEvent,
  RoundProgressEvent,
  RoundStartEvent,
  SubmitPlayAnswer,
} from "@project/api-contract";
import type { Track } from "@project/content-model";
import { PLAY_SOCKET_URL } from "@/config/network";
import store from "@/redux/store";
import { addXp } from "@/redux/xp-slice";
import { answerResult, lobbyChanged, syncedWithServer, matchEnded, matchStarted, playerLeft, queueStatus, roundEnded, roundProgress, roundStarted, setConnected } from "@/redux/play-slice";

let socket: Socket | null = null;
/** The track being searched, so a reconnect can rejoin the queue the server dropped. */
let queuedTrack: Track | null = null;
const REPLY_TIMEOUT_MS = 8000;
const RETRY_AFTER_REFUSAL_MS = 5000;

/** The one `/play` connection of the signed-in learner; it presents the current token on every (re)connect. */
function playSocket(): Socket {
  if (socket) {
    if (!socket.active) socket.connect();
    return socket;
  }
  const created = io(PLAY_SOCKET_URL, { transports: ["websocket"], auth: (send) => send({ token: store.getState().session.accessToken ?? "" }) });
  const { dispatch } = store;
  created.on("connect", () => {
    dispatch(setConnected(true));
    if (queuedTrack && store.getState().play.queue?.searching) created.emit("queue:join", { track: queuedTrack });
  });
  created.on("play:sync", (event: PlaySyncEvent) => dispatch(syncedWithServer(event)));
  created.on("disconnect", () => dispatch(setConnected(false)));
  // A refused handshake (an access token that expired meanwhile) is not retried by socket.io itself;
  // try again shortly, when the token has been renewed, unless this connection was closed since.
  created.on("connect_error", () => {
    if (!created.active) setTimeout(() => socket === created && created.connect(), RETRY_AFTER_REFUSAL_MS);
  });
  created.on("queue:status", (event: QueueStatusEvent) => dispatch(queueStatus(event)));
  created.on("room:lobby", (event: LobbyEvent) => dispatch(lobbyChanged(event)));
  created.on("room:closed", () => dispatch(lobbyChanged(null)));
  created.on("match:start", (event: MatchStartEvent) => dispatch(matchStarted(event)));
  created.on("round:start", (event: RoundStartEvent) => dispatch(roundStarted(event)));
  created.on("round:progress", (event: RoundProgressEvent) => dispatch(roundProgress(event)));
  created.on("answer:result", (event: AnswerResultEvent) => dispatch(answerResult(event)));
  created.on("round:end", (event: RoundEndEvent) => dispatch(roundEnded(event)));
  created.on("match:player-left", (event: { userId: string }) => dispatch(playerLeft(event.userId)));
  created.on("match:end", (event: MatchEndEvent) => {
    dispatch(matchEnded(event));
    // The server has already added the game's XP to the account; this keeps the screen in step.
    dispatch(addXp(event.xpEarned));
  });
  socket = created;
  return created;
}

type Reply = { ok?: boolean; code?: string; error?: PlayError | null };

/** Sends a request and waits for the server's acknowledgement. */
function request(event: string, payload: unknown = {}): Promise<Reply> {
  return playSocket().timeout(REPLY_TIMEOUT_MS).emitWithAck(event, payload) as Promise<Reply>;
}

export const playService = {
  connect: () => void playSocket(),
  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },
  joinQueue: (track: Track) => {
    queuedTrack = track;
    return request("queue:join", { track });
  },
  leaveQueue: () => {
    queuedTrack = null;
    playSocket().emit("queue:leave");
  },
  playGhost: () => request("queue:ghost"),
  createRoom: (settings: CreateRoomRequest) => request("room:create", settings),
  joinRoom: (code: string) => request("room:join", { code }),
  setReady: (ready: boolean) => playSocket().emit("room:ready", { ready }),
  leaveRoom: () => playSocket().emit("room:leave"),
  kick: (userId: string) => request("room:kick", { userId }),
  startRoom: () => request("room:start"),
  answer: (submission: SubmitPlayAnswer) => playSocket().emit("match:answer", submission),
  leaveMatch: () => playSocket().emit("match:leave"),
};
