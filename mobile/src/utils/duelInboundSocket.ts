/** Incoming duel Socket.IO events — one `duel-live-slice` action per wire event. */
import type { Socket } from "socket.io-client";
import { logDuel, logError } from "@/utils/logger";
import { duelConnectionRefs, normalizeDuelReplayEntry } from "@/utils/duelSocketModels";
import store from "@/redux/store";
import {
  connectionLostCleared, connectionLostSet, duelEnded, matchFound, opponentLeftReceived,
  playersOnlineSet, queueRejected, rematchDeclined, roundResultReceived, roundStarted,
  wrongAnswerIncremented,
} from "@/redux/duel-live-slice";

export function bindDuelSocketEvents(socket: Socket) {
  socket.on("connect", () => { logDuel("socket:connected", { socketId: socket.id }); store.dispatch(connectionLostCleared()); });
  socket.on("disconnect", (reason) => { logDuel("socket:disconnected", { reason }); store.dispatch(connectionLostSet()); });
  socket.on("connect_error", (e) => logError("[DUEL]", e, { phase: "socket-connect" }));
  socket.on("queue_rejected", (p: { reason?: string }) => {
    logDuel("queue:rejected", { reason: p?.reason });
    store.dispatch(queueRejected(p?.reason ?? "authentication_required"));
  });
  socket.on("queue_status", (p) => store.dispatch(playersOnlineSet(p.players_online ?? 0)));
  socket.on("match_found", (p) => {
    const o = p.opponent as { username?: string; avatar_url?: string | null };
    store.dispatch(matchFound({ sessionId: p.session_id, opponent: { username: String(o?.username ?? ""), avatarUrl: typeof o?.avatar_url === "string" ? o.avatar_url : null } }));
  });
  socket.on("round_start", (p) => {
    const q = p.question ?? {};
    store.dispatch(roundStarted({ round: {
      roundNumber: p.round_number, prompt: q.prompt, codeSnippet: q.code_snippet,
      options: q.options ?? [], type: q.type ?? "MCQ",
      endsAt: typeof p.ends_in_ms === "number" && p.ends_in_ms > 0 ? Date.now() + p.ends_in_ms : 0,
    } }));
  });
  socket.on("round_result", (p) => {
    const p1 = p.player_ids?.player1 as string | undefined;
    const first = (p1 && duelConnectionRefs.userId) ? p1 === duelConnectionRefs.userId : true;
    store.dispatch(roundResultReceived({ score: { me: first ? p.scores.player1 : p.scores.player2, opp: first ? p.scores.player2 : p.scores.player1 }, lastCorrectAnswer: p.correct_answer as string }));
  });
  socket.on("answer_feedback", (p: { isCorrect: boolean }) => {
    if (!p.isCorrect) store.dispatch(wrongAnswerIncremented());
  });
  socket.on("duel_end", (p) => {
    const uid = duelConnectionRefs.userId;
    const od = store.getState().duelLive.opponentLeft;
    const sc = p.streak_current;
    const streak = typeof sc === "number" ? sc : typeof sc === "string" ? Number(sc) : undefined;
    store.dispatch(duelEnded({ duelEnd: {
      won: !p.tied && (uid ? (p.winner_user_id as string) === uid : (p.winner_user_id as string) === socket.id),
      xpEarned: Number(p.xp_earned ?? 0), streakCurrent: streak, finalScore: `${p.my_score ?? 0}-${p.opp_score ?? 0}`,
      roundReplay: Array.isArray(p.round_replay) ? p.round_replay.map(normalizeDuelReplayEntry) : [],
      ...(od ? { opponentDisconnected: true } : {}),
      ...(p.tied ? { tied: true } : {}),
    } }));
  });
  socket.on("opponent_disconnected", () => {
    logDuel("opponent:disconnected");
    store.dispatch(opponentLeftReceived());
  });
  socket.on("rematch_declined", () => store.dispatch(rematchDeclined()));
}
