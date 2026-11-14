import { randomInt } from "node:crypto";
import type { Namespace } from "socket.io";
import type { CreateRoomRequest, LobbyEvent, PlayError } from "@project/api-contract";
import { GAME_VARIANTS, roomCode } from "@project/match-engine";
import { pickPlayItems } from "./playItems.js";
import { seatsFor, startMatch } from "./playRegistry.js";

type Member = { userId: string; ready: boolean; joinedAt: number; pingMs: number };
type Room = CreateRoomRequest & { code: string; hostId: string; members: Member[]; lastActivity: number };

const rooms = new Map<string, Room>();
/** A lobby closes after 10 minutes without activity (PRD 11.7). */
const IDLE_CLOSE_MS = 10 * 60_000;
const MIN_PLAYERS = 2;

const cryptoRandom = () => randomInt(0, 1_000_000) / 1_000_000;

export function roomOf(userId: string): Room | undefined {
  return [...rooms.values()].find((room) => room.members.some((member) => member.userId === userId));
}

/** Sends the room's current state to everyone in it, also after one of them reconnects (PRD 11.8). */
export async function broadcastLobby(play: Namespace, room: Room): Promise<void> {
  room.lastActivity = Date.now();
  const seats = await seatsFor(room.members.map((member) => member.userId));
  const lobby: LobbyEvent = { code: room.code, hostId: room.hostId, track: room.track, variant: room.variant, rounds: room.rounds, maxPlayers: room.maxPlayers, players: seats.map((seat) => ({ ...seat, ready: room.members.find((member) => member.userId === seat.userId)?.ready ?? false })) };
  for (const member of room.members) play.to(`user:${member.userId}`).emit("room:lobby", lobby);
}

export async function createRoom(play: Namespace, hostId: string, settings: CreateRoomRequest, pingMs: number): Promise<string> {
  let code = roomCode(cryptoRandom);
  while (rooms.has(code)) code = roomCode(cryptoRandom);
  const room: Room = { ...settings, code, hostId, members: [{ userId: hostId, ready: false, joinedAt: Date.now(), pingMs }], lastActivity: Date.now() };
  rooms.set(code, room);
  await broadcastLobby(play, room);
  return code;
}

export async function joinRoom(play: Namespace, userId: string, code: string, pingMs: number): Promise<PlayError | null> {
  const room = rooms.get(code);
  if (!room) return "room-not-found";
  if (room.members.some((member) => member.userId === userId)) return null;
  if (room.members.length >= room.maxPlayers) return "room-full";
  room.members.push({ userId, ready: false, joinedAt: Date.now(), pingMs });
  await broadcastLobby(play, room);
  return null;
}

export async function setReady(play: Namespace, userId: string, ready: boolean): Promise<void> {
  const room = roomOf(userId);
  const member = room?.members.find((candidate) => candidate.userId === userId);
  if (!room || !member) return;
  member.ready = ready;
  await broadcastLobby(play, room);
}

/** Leaving hands the host role to the player who has been there longest; an empty room closes. */
export async function leaveRoom(play: Namespace, userId: string): Promise<void> {
  const room = roomOf(userId);
  if (!room) return;
  room.members = room.members.filter((member) => member.userId !== userId);
  play.to(`user:${userId}`).emit("room:closed", { code: room.code });
  if (room.members.length === 0) {
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === userId) room.hostId = [...room.members].sort((left, right) => left.joinedAt - right.joinedAt)[0].userId;
  await broadcastLobby(play, room);
}

export async function kickFromRoom(play: Namespace, hostId: string, userId: string): Promise<PlayError | null> {
  const room = roomOf(hostId);
  if (!room || room.hostId !== hostId) return "not-host";
  if (userId !== hostId) await leaveRoom(play, userId);
  return null;
}

/** The host starts once at least two players are in and everyone is ready. */
export async function startRoom(play: Namespace, hostId: string): Promise<PlayError | null> {
  const room = roomOf(hostId);
  if (!room || room.hostId !== hostId) return "not-host";
  if (room.members.length < MIN_PLAYERS || room.members.some((member) => !member.ready)) return "not-enough-players";
  rooms.delete(room.code);
  const userIds = room.members.map((member) => member.userId);
  const [seats, items] = await Promise.all([seatsFor(userIds), pickPlayItems(room.track, room.rounds, userIds, GAME_VARIANTS[room.variant].format)]);
  const game = { mode: "room" as const, variant: room.variant, track: room.track, roomCode: room.code };
  startMatch(play, game, seats.map((seat) => ({ ...seat, pingMs: room.members.find((member) => member.userId === seat.userId)?.pingMs ?? 0 })), items, (result) => reopenRoom(play, room, result.state.players));
  return null;
}

/**
 * After a room's game, the same room opens again for everyone who stayed, nobody ready, so the
 * results screen can lead "back to lobby" (PRD 11.7). The host stays host if they stayed.
 */
async function reopenRoom(play: Namespace, room: Room, players: { id: string; left: boolean }[]): Promise<void> {
  const stayed = room.members.filter((member) => players.some((player) => player.id === member.userId && !player.left) && !roomOf(member.userId));
  if (stayed.length === 0 || rooms.has(room.code)) return;
  const hostId = stayed.some((member) => member.userId === room.hostId) ? room.hostId : stayed[0].userId;
  const reopened: Room = { ...room, hostId, members: stayed.map((member) => ({ ...member, ready: false })), lastActivity: Date.now() };
  rooms.set(room.code, reopened);
  await broadcastLobby(play, reopened);
}

/** Closes lobbies nobody touched for ten minutes. */
export function startRoomJanitor(play: Namespace): NodeJS.Timeout {
  return setInterval(() => {
    for (const room of [...rooms.values()]) {
      if (Date.now() - room.lastActivity < IDLE_CLOSE_MS) continue;
      rooms.delete(room.code);
      for (const member of room.members) play.to(`user:${member.userId}`).emit("room:closed", { code: room.code });
    }
  }, 60_000);
}
