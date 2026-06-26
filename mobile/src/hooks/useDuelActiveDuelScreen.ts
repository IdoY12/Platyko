import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { AppState, type AppStateStatus } from "react-native";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { addXp } from "@/redux/xp-slice";
import { addStudySeconds } from "@/redux/session-slice";
import { applyDuelResult } from "@/redux/duel-slice";
import { hydrateStreak, runStreakAppOpen, runStreakQualifyingExercise } from "@/redux/streak-slice";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { logDuel, logNav } from "@/utils/logger";
import { useDuelActiveDuelLive, useDuelConnectionGuard } from "@/hooks/useDuelSocket";
import { duelSubmitAnswer, duelPlayerReady } from "@/utils/duelSocketCommands";
import type { DuelStackParamList } from "@/types/duelNavigation.types";
import { DUEL_MAX_ATTEMPTS_PER_ROUND } from "@project/duel-constants";
export function useDuelActiveDuelScreen(navigation: NativeStackNavigationProp<DuelStackParamList, "ActiveDuel">) {
  const dispatch = useAppDispatch();
  const { round, score, sessionId, duelEnd, opponent, lastCorrectAnswer, wrongAnswerCount, opponentLeft } = useDuelActiveDuelLive();
  const connectionLost = useDuelConnectionGuard(navigation, duelEnd != null);
  const userId = useAppSelector((s) => s.session.userId);
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const username = useAppSelector((s) => s.profile.username);
  const isFocused = useIsFocused();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const locked = lastCorrectAnswer !== null || submitted || wrongAnswerCount >= DUEL_MAX_ATTEMPTS_PER_ROUND;
  const roundStartTimeRef = useRef(Date.now());
  const skipLeaveAfterEndRef = useRef(false);
  const duelEndNavigatedRef = useRef(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const hasDuelEnd = duelEnd != null;
  const roundNumKey = round?.roundNumber ?? null;

  useEffect(() => { logNav("screen:enter", { screen: "ActiveDuelScreen" }); return () => logNav("screen:leave", { screen: "ActiveDuelScreen" }); }, []);
  useEffect(() => {
    if (!isFocused || roundNumKey == null || hasDuelEnd) return;
    const sub = AppState.addEventListener("change", (next) => { appStateRef.current = next; });
    const t = setInterval(() => {
      if (appStateRef.current === "active") dispatch(addStudySeconds(1));
    }, 1000);
    return () => { clearInterval(t); sub.remove(); };
  }, [dispatch, hasDuelEnd, isFocused, roundNumKey]);
  useEffect(() => {
    if (!round) return;
    setSelected(null); setSubmitted(false); roundStartTimeRef.current = Date.now();
  }, [round]);
  useEffect(() => { setSubmitted(false); }, [wrongAnswerCount]);
  useEffect(() => { if (sessionId && userId) duelPlayerReady(sessionId); }, [sessionId, userId]);

  useEffect(() => {
    if (!duelEnd || duelEndNavigatedRef.current) return;
    duelEndNavigatedRef.current = true;
    skipLeaveAfterEndRef.current = true;
    logDuel("duel:end", { won: duelEnd.won, xpEarned: duelEnd.xpEarned });
    dispatch(addXp(duelEnd.xpEarned));
    const today = getStreakCalendarDate();
    if (isGuest && duelEnd.xpEarned > 0) {
      dispatch(runStreakAppOpen({ today }));
      dispatch(runStreakQualifyingExercise({ today }));
    } else if (!isGuest && typeof duelEnd.streakCurrent === "number") {
      dispatch(hydrateStreak({ streakCurrent: duelEnd.streakCurrent, lastActivityDate: today, lastCheckedDate: today }));
    }
    if (!duelEnd.tied) dispatch(applyDuelResult({ won: duelEnd.won }));
    navigation.replace("DuelResults", { won: duelEnd.won, score: duelEnd.finalScore, xpEarned: duelEnd.xpEarned, replay: duelEnd.roundReplay, ...(duelEnd.opponentDisconnected ? { opponentDisconnected: true } : {}), ...(duelEnd.tied ? { tied: true } : {}) });
  }, [dispatch, duelEnd, isGuest, navigation]);
  const submit = useCallback((answer: string) => {
    if (!sessionId || !userId || lockedRef.current) return;
    duelSubmitAnswer({ sessionId, roundNumber: round?.roundNumber ?? 0, answer, timeTakenMs: Date.now() - roundStartTimeRef.current });
    setSelected(answer);
    setSubmitted(true);
  }, [sessionId, userId, round?.roundNumber]);
  return { round, username, opponentName: opponent?.username ?? "Opponent", opponentAvatarUrl: opponent?.avatarUrl ?? null, roundNumber: round?.roundNumber ?? 0, selected, myScore: score.me, oppScore: score.opp, overlayVisible: lastCorrectAnswer !== null, lastCorrectAnswer, locked, attemptsLeft: DUEL_MAX_ATTEMPTS_PER_ROUND - wrongAnswerCount, submit, sessionId, skipLeaveAfterEndRef, opponentLeft, connectionLost };
}
