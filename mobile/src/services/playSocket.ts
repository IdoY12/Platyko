import { io, type Socket } from "socket.io-client";
import type {
  AnswerResultEvent,
  CreateRoomRequest,
  InviteClosedEvent,
  InviteEvent,
  LobbyEvent,
  MatchEndEvent,
  MatchStartEvent,
  PlayError,
  PlaySyncEvent,
  PresenceEvent,
  Reaction,
  ReactionEvent,
  QueueStatusEvent,
  RoundEndEvent,
  RoundProgressEvent,
  RoundStartEvent,
  SubmitPlayAnswer,
} from "@project/api-contract";
import type { Track } from "@project/content-model";
import { PLAY_SOCKET_URL } from "@/config/network";
import store from "@/redux/store";
import UserService from "@/services/auth-aware/UserService";
import { addXp } from "@/redux/xp-slice";
import {
  answerResult,
  inviteClosed,
  inviteReceived,
  invitesListed,
  lobbyChanged,
  matchEnded,
  matchStarted,
  playerLeft,
  presenceSnapshot,
  presenceUpdated,
  queueStatus,
  reactionReceived,
  roundEnded,
  roundProgress,
  roundStarted,
  setConnected,
  syncedWithServer,
} from "@/redux/play-slice";

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
    // The inbox is read again on every connection: invitations may have arrived while offline.
    void request("invite:list").then((reply) => dispatch(invitesListed(reply.invites ?? [])), () => undefined);
  });
  created.on("presence:snapshot", (events: PresenceEvent[]) => dispatch(presenceSnapshot(events)));
  created.on("presence:update", (event: PresenceEvent) => dispatch(presenceUpdated(event)));
  created.on("invite:received", (event: InviteEvent) => dispatch(inviteReceived(event)));
  created.on("invite:closed", (event: InviteClosedEvent) => dispatch(inviteClosed(event.inviteId)));
  created.on("play:sync", (event: PlaySyncEvent) => dispatch(syncedWithServer(event)));
  created.on("disconnect", () => dispatch(setConnected(false)));
  // socket.io does not retry a refused handshake, most often an access token that expired. Any
  // authenticated request renews it (or signs out when the session is gone, which closes this
  // connection); then try again, unless this connection was closed meanwhile.
  created.on("connect_error", () => {
    if (created.active) return;
    setTimeout(() => {
      if (socket !== created || !store.getState().session.isAuthenticated) return;
      void new UserService()
        .getMe()
        .catch(() => undefined)
        .finally(() => socket === created && created.connect());
    }, RETRY_AFTER_REFUSAL_MS);
  });
  created.on("queue:status", (event: QueueStatusEvent) => dispatch(queueStatus(event)));
  created.on("room:lobby", (event: LobbyEvent) => dispatch(lobbyChanged(event)));
  created.on("room:closed", () => dispatch(lobbyChanged(null)));
  created.on("match:start", (event: MatchStartEvent) => dispatch(matchStarted(event)));
  created.on("round:start", (event: RoundStartEvent) => dispatch(roundStarted(event)));
  created.on("round:progress", (event: RoundProgressEvent) => dispatch(roundProgress(event)));
  created.on("answer:result", (event: AnswerResultEvent) => dispatch(answerResult(event)));
  created.on("round:end", (event: RoundEndEvent) => dispatch(roundEnded(event)));
  created.on("match:reaction", (event: ReactionEvent) => dispatch(reactionReceived(event)));
  created.on("match:player-left", (event: { userId: string }) => dispatch(playerLeft(event.userId)));
  created.on("match:end", (event: MatchEndEvent) => {
    dispatch(matchEnded(event));
    // The server has already added the game's XP to the account; this keeps the screen in step.
    dispatch(addXp(event.xpEarned));
  });
  socket = created;
  return created;
}

type Reply = { ok?: boolean; code?: string; error?: PlayError | null; inviteId?: string; invites?: InviteEvent[] };

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
  react: (reaction: Reaction) => playSocket().emit("match:react", { reaction }),
  inviteToDuel: (userId: string, track: Track) => request("invite:duel", { userId, track }),
  inviteToRoom: (userId: string) => request("invite:room", { userId }),
  cancelInvite: () => playSocket().emit("invite:cancel"),
  answerInvite: (inviteId: string, accept: boolean) => request("invite:answer", { inviteId, accept }),
};

/**
 * Development only: a fast refresh runs this module again. The connection of the replaced copy, and
 * its retry timer, must close with it; left running, its requests refresh the session with their own
 * single-flight guard, and two refreshes with one token revoke the session as a reuse.
 */
(module as { hot?: { dispose: (callback: () => void) => void } }).hot?.dispose(() => playService.disconnect());
