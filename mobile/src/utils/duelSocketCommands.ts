/** Imperative socket emit commands for the duel feature.
 * Runtime refs live in duelConnectionRefs; state mutations go via Redux actions in duel-live-slice. */
import type { Socket } from "socket.io-client";
import { duelConnectionRefs } from "@/utils/duelSocketModels";
import { connectDuelSocket } from "@/utils/duelSocketIo";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import store from "@/redux/store";
import { duelReset } from "@/redux/duel-live-slice";

const pendingEmit = new Map<string, () => void>();
function emitWhenReady(socket: Socket, event: string, body: object): void {
  if (socket.connected) { socket.emit(event, body); return; }
  const prev = pendingEmit.get(event);
  if (prev) socket.off("connect", prev);
  const cb = () => { pendingEmit.delete(event); socket.emit(event, body); };
  pendingEmit.set(event, cb);
  socket.once("connect", cb);
}

/** The server reads the display name from the DB; the payload carries nothing the client controls. */
export function duelJoinQueue(url: string, payload: { userId: string; token: string }) {
  const socket = connectDuelSocket(url, payload.token);
  duelConnectionRefs.userId = payload.userId;
  emitWhenReady(socket, "join_queue", {});
}

export function duelLeaveQueue() {
  duelConnectionRefs.socket?.emit("leave_queue");
}

export function duelLeaveDuel(sessionId: string) {
  duelConnectionRefs.socket?.emit("leave_duel", { session_id: sessionId });
}

export function duelPlayerReady(sessionId: string) {
  const socket = duelConnectionRefs.socket;
  if (!socket) return;
  emitWhenReady(socket, "player_ready", { session_id: sessionId, streak_local_date: getStreakCalendarDate() });
}

export function duelSubmitAnswer(payload: { sessionId: string; roundNumber: number; answer: string; timeTakenMs: number }) {
  duelConnectionRefs.socket?.emit("submit_answer", {
    session_id: payload.sessionId,
    round_number: payload.roundNumber,
    answer: payload.answer,
    time_taken_ms: payload.timeTakenMs,
    streak_local_date: getStreakCalendarDate(),
  });
}

export function duelResetMatch() {
  store.dispatch(duelReset());
}

export function duelRequestRematch(sessionId: string) {
  duelConnectionRefs.socket?.emit("rematch_request", { session_id: sessionId });
}
