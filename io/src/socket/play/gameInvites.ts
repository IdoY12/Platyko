import type { Namespace } from "socket.io";
import type { InviteClosedEvent, InviteEvent, InviteKind, PlayError } from "@project/api-contract";
import type { Track } from "@project/content-model";
import { prisma } from "@project/db";
import { GAME_MODES } from "@project/match-engine";
import { pickPlayItems } from "./playItems.js";
import { activeMatchOf, seatsFor, startMatch } from "./playRegistry.js";
import { isOnline } from "./presence.js";
import { joinRoom, roomOf } from "./privateRooms.js";

/** A duel invitation expires after 60 seconds (PRD 11.3). */
const DUEL_INVITE_MS = 60_000;
/** A room invitation lasts while the lobby can stay open without activity. */
const ROOM_INVITE_MS = 10 * 60_000;

const KIND: Record<"DUEL" | "ROOM", InviteKind> = { DUEL: "duel", ROOM: "room" };

const busy = (userId: string) => activeMatchOf(userId) !== undefined || roomOf(userId) !== undefined;

/**
 * Only an accepted friend who allows game invitations and has not blocked either way (PRD 11.2).
 * One answer for every refusal, so the sender never learns which setting stopped them.
 */
async function canInvite(fromId: string, toId: string): Promise<boolean> {
  const [friendship, recipient, block] = await Promise.all([
    prisma.friendship.findFirst({ where: { status: "ACCEPTED", OR: [{ requesterId: fromId, addresseeId: toId }, { requesterId: toId, addresseeId: fromId }] }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: toId }, select: { gameInvitePolicy: true } }),
    prisma.block.findFirst({ where: { OR: [{ blockerId: fromId, blockedId: toId }, { blockerId: toId, blockedId: fromId }] }, select: { blockerId: true } }),
  ]);
  return Boolean(friendship) && recipient?.gameInvitePolicy === "FRIENDS" && !block;
}

function closeFor(play: Namespace, inviteId: string, userIds: string[]): void {
  const event: InviteClosedEvent = { inviteId };
  for (const userId of userIds) play.to(`user:${userId}`).emit("invite:closed", event);
}

async function send(play: Namespace, fromId: string, toId: string, kind: "DUEL" | "ROOM", track: Track, roomCode: string | null): Promise<string> {
  const lifetimeMs = kind === "DUEL" ? DUEL_INVITE_MS : ROOM_INVITE_MS;
  const invite = await prisma.gameInvite.create({ data: { fromUserId: fromId, toUserId: toId, kind, track, roomCode, expiresAt: new Date(Date.now() + lifetimeMs) } });
  const [from] = await seatsFor([fromId]);
  const event: InviteEvent = { inviteId: invite.id, kind: KIND[kind], from, track, roomCode, expiresAt: invite.expiresAt.getTime() };
  play.to(`user:${toId}`).emit("invite:received", event);
  setTimeout(() => {
    void prisma.gameInvite.updateMany({ where: { id: invite.id, status: "PENDING" }, data: { status: "EXPIRED" } }).then(({ count }) => {
      if (count > 0) closeFor(play, invite.id, [fromId, toId]);
    });
  }, lifetimeMs).unref();
  return invite.id;
}

/** Withdraws the sender's open duel invitation, if any. */
export async function cancelDuelInvites(play: Namespace, fromId: string): Promise<void> {
  const open = await prisma.gameInvite.findMany({ where: { fromUserId: fromId, kind: "DUEL", status: "PENDING" }, select: { id: true, toUserId: true } });
  await prisma.gameInvite.updateMany({ where: { id: { in: open.map((invite) => invite.id) } }, data: { status: "CANCELLED" } });
  for (const invite of open) closeFor(play, invite.id, [fromId, invite.toUserId]);
}

/** A friends duel: 2 players, 5 rounds, the inviter's track, unrated (PRD 11.4). One open duel invitation per sender. */
export async function inviteToDuel(play: Namespace, fromId: string, toId: string, track: Track): Promise<{ inviteId: string } | { error: PlayError }> {
  if (busy(fromId)) return { error: "in-another-game" };
  if (fromId === toId || !(await canInvite(fromId, toId))) return { error: "cannot-invite" };
  if (busy(toId)) return { error: "friend-busy" };
  await cancelDuelInvites(play, fromId);
  return { inviteId: await send(play, fromId, toId, "DUEL", track, null) };
}

export async function inviteToRoom(play: Namespace, fromId: string, toId: string): Promise<PlayError | null> {
  const room = roomOf(fromId);
  if (!room) return "room-not-found";
  if (fromId === toId || !(await canInvite(fromId, toId))) return "cannot-invite";
  await send(play, fromId, toId, "ROOM", room.track, room.code);
  return null;
}

/** The invitations inbox (PRD 11.3): what is still open for this user, newest first. */
export async function openInvitesFor(userId: string): Promise<InviteEvent[]> {
  const rows = await prisma.gameInvite.findMany({ where: { toUserId: userId, status: "PENDING", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  const seats = await seatsFor([...new Set(rows.map((row) => row.fromUserId))]);
  return rows.flatMap((row) => {
    const from = seats.find((seat) => seat.userId === row.fromUserId);
    return from && row.track ? [{ inviteId: row.id, kind: KIND[row.kind], from, track: row.track, roomCode: row.roomCode, expiresAt: row.expiresAt.getTime() }] : [];
  });
}

/** Accepting a duel starts it at once; accepting a room invitation joins the lobby. */
export async function answerInvite(play: Namespace, userId: string, inviteId: string, accept: boolean, pingMs: number): Promise<PlayError | null> {
  const invite = await prisma.gameInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.toUserId !== userId || invite.status !== "PENDING" || invite.expiresAt.getTime() <= Date.now()) return "invite-gone";
  const close = (status: "ACCEPTED" | "DECLINED") => prisma.gameInvite.update({ where: { id: inviteId }, data: { status } }).then(() => closeFor(play, inviteId, [invite.fromUserId, userId]));
  if (!accept) return close("DECLINED").then(() => null);
  if (busy(userId)) return "in-another-game";
  if (invite.kind === "ROOM") {
    const refused = await joinRoom(play, userId, invite.roomCode ?? "", pingMs);
    if (!refused) await close("ACCEPTED");
    return refused;
  }
  if (busy(invite.fromUserId) || !isOnline(play, invite.fromUserId) || !invite.track) return "friend-busy";
  await close("ACCEPTED");
  const userIds = [invite.fromUserId, userId];
  const [seats, items] = await Promise.all([seatsFor(userIds), pickPlayItems(invite.track, GAME_MODES.friends.rounds[0], userIds)]);
  startMatch(play, { mode: "friend", variant: "classic", track: invite.track, roomCode: null }, seats.map((seat) => ({ ...seat, pingMs: seat.userId === userId ? pingMs : 0 })), items);
  return null;
}
