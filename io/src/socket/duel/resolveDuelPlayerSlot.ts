import type { Socket } from "socket.io";
import type { SessionState } from "./types.js";

type DuelPlayerSlot = "player1" | "player2";

/** Returns which slot a socket occupies; falls back to userId, updates socketId, and re-joins the room on reconnect. */
export function resolveDuelPlayerSlot(session: SessionState, socket: Socket, userId?: string): DuelPlayerSlot | null {
  const socketId = socket.id;
  let slot: DuelPlayerSlot | null = null;
  if (socketId === session.player1.socketId) slot = "player1";
  else if (socketId === session.player2.socketId) slot = "player2";
  else if (userId === session.player1.userId) { session.player1.socketId = socketId; slot = "player1"; }
  else if (userId === session.player2.userId) { session.player2.socketId = socketId; slot = "player2"; }
  if (slot) void socket.join(session.roomId);
  return slot;
}
