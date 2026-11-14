import type { Server } from "socket.io";
import { REACTIONS, type PlaySyncEvent, type Reaction } from "@project/api-contract";
import { GAME_MODES, isGameVariant, isRoomCode } from "@project/match-engine";
import { TRACKS, type ItemAnswer, type Track } from "@project/content-model";
import { isThrottled } from "../../utils/socketThrottle.js";
import { logInfo } from "../../utils/logger.js";
import { attachSocketAuthentication, type AuthenticatedSocket } from "../authenticateSocket.js";
import { activeMatchOf } from "./playRegistry.js";
import { broadcastLobby, createRoom, joinRoom, kickFromRoom, leaveRoom, roomOf, setReady, startRoom, startRoomJanitor } from "./privateRooms.js";
import { joinRankedQueue, leaveRankedQueue, startGhostMatch, startRankedMatchmaking } from "./rankedQueue.js";
import { answerInvite, cancelDuelInvites, inviteToDuel, inviteToRoom, openInvitesFor } from "./gameInvites.js";
import { presenceSnapshotFor, startPresenceSweep } from "./presence.js";

/** A lobby keeps a disconnected player this long (PRD 11.8). */
const LOBBY_GRACE_MS = 15_000;
const MIN_EVENT_INTERVAL_MS = 150;
const REACTION_INTERVAL_MS = 2000;

const isTrack = (value: unknown): value is Track => typeof value === "string" && (TRACKS as readonly string[]).includes(value);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const ANSWER_KINDS = ["option", "text", "order", "outputOrder", "blanks", "bugFix"];

/** Accepts only the answer shapes the shared checker knows, with sane sizes. */
function isAnswer(value: unknown): value is ItemAnswer {
  if (!isRecord(value) || typeof value.kind !== "string" || !ANSWER_KINDS.includes(value.kind)) return false;
  return JSON.stringify(value).length < 4000;
}

/**
 * The `/play` namespace (PRD 11.4–11.9): ranked queue with ghost practice, private rooms, and the
 * game itself. Each user joins a room named after them, so a reconnect on a new socket keeps
 * receiving their game. Every payload is checked; anything malformed is ignored.
 */
export function attachPlayNamespace(io: Server): void {
  const play = io.of("/play");
  attachSocketAuthentication(play, "[PLAY]");
  startRankedMatchmaking(play);
  startRoomJanitor(play);
  startPresenceSweep(play);
  const lobbyGrace = new Map<string, NodeJS.Timeout>();

  play.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.authenticatedUserId ?? "";
    const pingMs = () => Number(socket.handshake.query.ping ?? 0) || 0;
    void socket.join(`user:${userId}`);
    clearTimeout(lobbyGrace.get(userId));
    activeMatchOf(userId)?.reconnected(userId);
    const room = roomOf(userId);
    if (room) void broadcastLobby(play, room);
    const sync: PlaySyncEvent = { inMatch: activeMatchOf(userId) !== undefined, inRoom: room !== undefined };
    socket.emit("play:sync", sync);
    void presenceSnapshotFor(play, userId).then((statuses) => socket.emit("presence:snapshot", statuses));
    logInfo("[PLAY]", "socket:connected", { userId });

    const on = (event: string, handler: (payload: unknown, reply: (response: unknown) => void) => void | Promise<void>) =>
      socket.on(event, (payload: unknown, ack?: unknown) => {
        if (isThrottled(socket, event, MIN_EVENT_INTERVAL_MS)) return;
        const reply = typeof ack === "function" ? (ack as (response: unknown) => void) : () => undefined;
        void handler(payload, reply);
      });
    const busy = () => activeMatchOf(userId) !== undefined || roomOf(userId) !== undefined;

    on("queue:join", async (payload, reply) => {
      if (!isRecord(payload) || !isTrack(payload.track)) return;
      if (busy()) return reply({ error: "in-another-game" });
      const refused = await joinRankedQueue(userId, payload.track, pingMs());
      reply(refused ? { error: refused } : { ok: true });
    });
    on("queue:leave", () => leaveRankedQueue(userId));
    on("queue:ghost", async (_payload, reply) => reply({ ok: await startGhostMatch(play, userId) }));

    on("room:create", async (payload, reply) => {
      const rounds = Number(isRecord(payload) ? payload.rounds : NaN);
      const maxPlayers = Number(isRecord(payload) ? payload.maxPlayers : NaN);
      const { players, rounds: allowedRounds } = GAME_MODES.room;
      if (!isRecord(payload) || !isTrack(payload.track) || !(allowedRounds as readonly number[]).includes(rounds) || maxPlayers < players[0] || maxPlayers > players[1]) return;
      const variant = payload.variant === undefined ? "classic" : payload.variant;
      if (!isGameVariant(variant)) return;
      if (busy()) return reply({ error: "in-another-game" });
      reply({ code: await createRoom(play, userId, { track: payload.track, variant, rounds, maxPlayers }, pingMs()) });
    });
    on("room:join", async (payload, reply) => {
      if (!isRecord(payload) || typeof payload.code !== "string" || !isRoomCode(payload.code.toUpperCase())) return reply({ error: "room-not-found" });
      if (activeMatchOf(userId)) return reply({ error: "in-another-game" });
      const error = await joinRoom(play, userId, payload.code.toUpperCase(), pingMs());
      reply(error ? { error } : { ok: true });
    });
    on("room:ready", (payload) => (isRecord(payload) && typeof payload.ready === "boolean" ? setReady(play, userId, payload.ready) : undefined));
    on("room:leave", () => leaveRoom(play, userId));
    on("room:kick", async (payload, reply) => (isRecord(payload) && typeof payload.userId === "string" ? reply({ error: await kickFromRoom(play, userId, payload.userId) }) : undefined));
    on("room:start", async (_payload, reply) => reply({ error: await startRoom(play, userId) }));

    on("match:answer", (payload) => {
      if (!isRecord(payload) || typeof payload.matchId !== "string" || typeof payload.round !== "number" || !isAnswer(payload.answer)) return;
      const match = activeMatchOf(userId);
      if (match?.id === payload.matchId) match.answer(userId, payload.round, payload.answer);
    });
    on("match:leave", () => activeMatchOf(userId)?.leave(userId));
    on("match:react", (payload) => {
      // At most one reaction every two seconds, on top of the general event limit.
      if (!isRecord(payload) || !(REACTIONS as readonly unknown[]).includes(payload.reaction) || isThrottled(socket, "match:react:cooldown", REACTION_INTERVAL_MS)) return;
      activeMatchOf(userId)?.react(userId, payload.reaction as Reaction);
    });

    on("invite:duel", async (payload, reply) => {
      if (!isRecord(payload) || typeof payload.userId !== "string" || !isTrack(payload.track)) return;
      reply(await inviteToDuel(play, userId, payload.userId, payload.track));
    });
    on("invite:room", async (payload, reply) => (isRecord(payload) && typeof payload.userId === "string" ? reply({ error: await inviteToRoom(play, userId, payload.userId) }) : undefined));
    on("invite:cancel", () => cancelDuelInvites(play, userId));
    on("invite:list", async (_payload, reply) => reply({ invites: await openInvitesFor(userId) }));
    on("invite:answer", async (payload, reply) => {
      if (!isRecord(payload) || typeof payload.inviteId !== "string" || typeof payload.accept !== "boolean") return;
      reply({ error: await answerInvite(play, userId, payload.inviteId, payload.accept, pingMs()) });
    });

    socket.on("disconnect", () => {
      leaveRankedQueue(userId);
      activeMatchOf(userId)?.disconnected(userId);
      if (roomOf(userId)) lobbyGrace.set(userId, setTimeout(() => void leaveRoom(play, userId), LOBBY_GRACE_MS));
    });
  });
}
