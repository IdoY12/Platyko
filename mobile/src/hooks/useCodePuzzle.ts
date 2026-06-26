import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setCachedAllPuzzles } from "@/redux/puzzle-slice";
import store from "@/redux/store";
import { addStudySeconds } from "@/redux/session-slice";
import { useAuthenticatedService } from "@/hooks/useAuthenticatedService";
import PuzzleService, { type Puzzle } from "@/services/auth-aware/PuzzleService";
import { applyGuestPuzzleSolve, applyRegisteredPuzzleSolve } from "@/utils/puzzleSubmitRewards";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

const MS_DAY = 1000 * 60 * 60 * 24;

export function useCodePuzzle() {
  const dispatch = useAppDispatch();
  const focused = useIsFocused();
  const appRef = useRef(AppState.currentState as AppStateStatus);
  const isGuest = useAppSelector((s) => s.session.isGuest);
  const xpSolveCounts = useAppSelector((s) => s.puzzle.xpSolveCounts);
  const xpTotal = useAppSelector((s) => s.xp.xpTotal);
  const puzzleService = useAuthenticatedService(PuzzleService);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [refOpen, setRefOpen] = useState(false);
  const puzzle = puzzles[puzzleIndex] ?? null;

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener("change", (nextAppState) => { appRef.current = nextAppState; });
    if (!focused) return () => appStateSubscription.remove();
    const studyTimerId = setInterval(() => appRef.current === "active" && dispatch(addStudySeconds(1)), 1000);
    return () => { clearInterval(studyTimerId); appStateSubscription.remove(); };
  }, [dispatch, focused]);
  useEffect(() => { setRefOpen(false); }, [puzzle?.id]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setFeedbackMessage(null);
    const cachedPuzzleList = store.getState().puzzle.allPuzzles;
    const puzzleCountToIndex = (puzzleCount: number) => Math.floor(Date.now() / MS_DAY) % puzzleCount;
    if (cachedPuzzleList !== null) {
      setPuzzles(cachedPuzzleList); if (cachedPuzzleList.length) setPuzzleIndex(puzzleCountToIndex(cachedPuzzleList.length)); setLoading(false);
      return () => { cancelled = true; };
    }
    puzzleService.getAllPuzzles().then((loadedPuzzles) => {
      if (cancelled) return; dispatch(setCachedAllPuzzles(loadedPuzzles)); setPuzzles(loadedPuzzles);
      if (loadedPuzzles.length) setPuzzleIndex(puzzleCountToIndex(loadedPuzzles.length));
    }).catch(() => !cancelled && setFeedbackMessage("Failed to load puzzles. Please try again.")).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [dispatch, puzzleService]);

  const onSubmit = useCallback(async () => {
    if (!puzzle) return;
    if (!input.trim()) { setFeedbackMessage("Please enter a one-line JavaScript expression."); return; }
    const calendarDateISO = getStreakCalendarDate();
    try {
      const submitResult = await puzzleService.submitPuzzle(puzzle.id, { answer: input, clientLocalDate: calendarDateISO });
      if (!submitResult.correct) { setFeedbackMessage("Not quite. Try another valid one-line expression."); return; }
      setFeedbackMessage(
        isGuest
          ? applyGuestPuzzleSolve(dispatch, puzzle.id, xpSolveCounts, calendarDateISO, xpTotal)
          : applyRegisteredPuzzleSolve(dispatch, submitResult, calendarDateISO),
      );
    } catch { setFeedbackMessage("Failed to submit. Please try again."); }
  }, [dispatch, input, isGuest, puzzle, puzzleService, xpSolveCounts, xpTotal]);
  const revealReferenceAnswer = useCallback(() => setRefOpen(true), []);
  const setCurrentIndex = useCallback((u: SetStateAction<number>) => { setRefOpen(false); setPuzzleIndex(u); }, []);
  return {
    loading, puzzle, puzzles, currentIndex: puzzleIndex, setCurrentIndex, input, setInput, message: feedbackMessage, onSubmit,
    revealReferenceAnswer, referenceSnippet: puzzle && refOpen ? puzzle.acceptedAnswers[0] ?? "" : null,
  };
}
