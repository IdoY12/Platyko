import { useCallback, useEffect, useMemo, useRef } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import store from "@/redux/store";
import { DUEL_SOCKET_URL } from "../config/network";
import { duelConnectionRefs } from "@/utils/duelSocketModels";
import { connectDuelSocket } from "@/utils/duelSocketIo";
import { refreshSessionOrLogoutOnForeground } from "@/utils/appShellPersistence";
import { duelJoinQueue, duelLeaveQueue, duelRequestRematch } from "@/utils/duelSocketCommands";
import { duelReset } from "@/redux/duel-live-slice";
import type { DuelStackParamList } from "@/types/duelNavigation.types";

export function useDuelSocketBootstrap() {
  const accessToken = useAppSelector((s) => s.session.accessToken);
  const userId = useAppSelector((s) => s.session.userId);
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
    if (duelConnectionRefs.socket) duelConnectionRefs.socket.auth = { token: accessToken ?? "" };
  }, [accessToken]);
  const url = useMemo(() => DUEL_SOCKET_URL, []);
  useEffect(() => {
    connectDuelSocket(url, accessTokenRef.current);
    return () => {
      duelConnectionRefs.socket?.disconnect();
      duelConnectionRefs.socket = null;
    };
  }, [userId, url]);
}

export function useDuelMatchmakingSocket() {
  const dispatch = useAppDispatch();
  const playersOnline = useAppSelector((s) => s.duelLive.playersOnline);
  const sessionId = useAppSelector((s) => s.duelLive.sessionId);
  const opponent = useAppSelector((s) => s.duelLive.opponent);
  const queueRejected = useAppSelector((s) => s.duelLive.queueRejected);
  const url = useMemo(() => DUEL_SOCKET_URL, []);
  const joinQueue = useCallback(
    async (p: { userId: string; username: string; token?: string | null }) => {
      await refreshSessionOrLogoutOnForeground(p.token ?? "", dispatch);
      const next = store.getState().session.accessToken;
      if (!next) return;
      duelJoinQueue(url, { ...p, token: next });
    },
    [dispatch, url],
  );
  return { playersOnline, sessionId, opponent, joinQueue, leaveQueue: duelLeaveQueue, queueRejected };
}

export function useDuelResultsSocket() {
  const sessionId = useAppSelector((s) => s.duelLive.sessionId);
  const rematchStatus = useAppSelector((s) => s.duelLive.rematchStatus);
  return { sessionId, rematchStatus, requestRematch: duelRequestRematch };
}

export function useDuelConnectionGuard(navigation: NativeStackNavigationProp<DuelStackParamList, "ActiveDuel">, hasDuelEnd: boolean): boolean {
  const dispatch = useAppDispatch();
  const connectionLost = useAppSelector((s) => s.duelLive.connectionLost);
  const pendingRef = useRef(false);
  useEffect(() => {
    pendingRef.current = connectionLost && !hasDuelEnd;
    if (!pendingRef.current) return;
    const t = setTimeout(() => { if (pendingRef.current) { dispatch(duelReset()); navigation.popToTop(); } }, 8_000);
    return () => clearTimeout(t);
  }, [connectionLost, hasDuelEnd, dispatch, navigation]);
  return connectionLost;
}

export function useDuelActiveDuelLive() {
  const round = useAppSelector((s) => s.duelLive.round);
  const score = useAppSelector((s) => s.duelLive.score);
  const sessionId = useAppSelector((s) => s.duelLive.sessionId);
  const duelEnd = useAppSelector((s) => s.duelLive.duelEnd);
  const opponent = useAppSelector((s) => s.duelLive.opponent);
  const lastCorrectAnswer = useAppSelector((s) => s.duelLive.lastCorrectAnswer);
  const wrongAnswerCount = useAppSelector((s) => s.duelLive.wrongAnswerCount);
  const opponentLeft = useAppSelector((s) => s.duelLive.opponentLeft);
  return { round, score, sessionId, duelEnd, opponent, lastCorrectAnswer, wrongAnswerCount, opponentLeft };
}
