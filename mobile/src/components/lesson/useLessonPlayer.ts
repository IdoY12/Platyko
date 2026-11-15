import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import NetInfo from "@react-native-community/netinfo";
import { checkItemAnswer, type Item, type ItemTrace } from "@project/content-model";
import type { ConceptCard } from "@project/content-model";
import {
  advanceLesson,
  answerCurrentItem,
  buildLessonPlan,
  buildSummaryLessonPlan,
  currentSlot,
  dailyChallengeDate,
  dailyChallengeItemIds,
  isJumpTestPassed,
  isLessonFinished,
  jumpTestItemIds,
  jumpTestTrack,
  lessonProgress,
  lessonResult,
  pickReviewItems,
  revisionChoice,
  startLessonSession,
  summaryLessonId,
  type AttemptOutcome,
  type LessonSession,
} from "@project/learning-logic";
import type { JudgeCodeResponse } from "@project/api-contract";
import { LESSON_SLOTS } from "@project/content-model";
import ContentService from "@/services/auth-aware/ContentService";
import ProgressService from "@/services/auth-aware/ProgressService";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import store from "@/redux/store";
import { cacheLesson, recordAttempt, recordDailyChallenge, recordJumpTestPass, recordLessonCompletion, saveResume } from "@/redux/learning-slice";
import { syncLearningProgress } from "@/redux/learning-sync";
import { haptic } from "@/theme/haptics";
import { getStreakCalendarDate } from "@/utils/streakCalendar";
import { logError } from "@/utils/logger";
import { draftToAnswer, emptyDraft, isDraftReady, shuffledOutputLines, type AnswerDraft } from "./answerDraft";
import { conceptByItemId, dueReviewCandidates, reviewCandidatesFor, revisionCandidates } from "./lessonReview";

export const REVIEW_SESSION_ID = "review";

/** What the learner saw after pressing "Check". */
export type CheckedAnswer = {
  outcome: AttemptOutcome;
  correct: boolean;
  /** The option whose feedback explains the mistake, when the answer maps to one. */
  optionIndex: number | null;
  wrongLine: boolean;
  /** `CODE_WRITE` only: why the sandbox rejected the code. */
  codeVerdict: JudgeCodeResponse | null;
};

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready" };

const MOOD_WINDOW = 5;

function itemHintsUsed(hints: Record<string, number>, itemId: string): number {
  return hints[itemId] ?? 0;
}

/**
 * Drives one lesson: loading (from the device cache when offline), the plan with its review
 * slots, answering with two attempts and hints, recording every attempt, saving the place for
 * "Continue", and finishing with the result. The mascot never appears while an item is open;
 * that is the screen's job, this hook only exposes what it needs.
 */
export function useLessonPlayer(lessonId: string) {
  const dispatch = useAppDispatch();
  const isGuest = useAppSelector((state) => state.session.isGuest);
  const map = useAppSelector((state) => state.learning.map);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [items, setItems] = useState<Record<string, Item>>({});
  const [conceptCard, setConceptCard] = useState<{ card: ConceptCard; trace: ItemTrace | null } | null>(null);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [draft, setDraft] = useState<AnswerDraft | null>(null);
  const [checked, setChecked] = useState<CheckedAnswer | null>(null);
  const [judging, setJudging] = useState(false);
  const [hints, setHints] = useState<Record<string, number>>({});
  const [recentResults, setRecentResults] = useState<boolean[]>([]);
  const xpAtStart = useRef(store.getState().learning.progress.xpTotal);
  const concepts = useMemo(() => conceptByItemId(map), [map]);
  /** The track a jump test opens; null for a lesson or a review. */
  const jumpTrack = jumpTestTrack(lessonId);
  /** The day of a daily challenge; null otherwise. */
  const challengeDate = dailyChallengeDate(lessonId);
  /** A jump test and a daily challenge give one attempt per item and no hints. */
  const isTest = jumpTrack !== null || challengeDate !== null;
  /** The units and length of a revision session; null otherwise. */
  const revision = useMemo(() => revisionChoice(lessonId), [lessonId]);
  /** Reviews, revisions, jump tests and challenges belong to no lesson: no place to save, no completion. */
  const isLesson = lessonId !== REVIEW_SESSION_ID && revision === null && !isTest;

  const slot = session ? currentSlot(session) : null;
  const item = slot?.kind === "item" ? items[slot.itemId] ?? null : null;

  // Loading: the lesson's own content, then the review items it needs, from the cache when possible.
  useEffect(() => {
    let cancelled = false;
    const content = new ContentService();
    const today = getStreakCalendarDate();
    const { learning } = store.getState();

    async function loadItemsById(itemIds: string[], known: Record<string, Item>): Promise<Record<string, Item>> {
      const missing = itemIds.filter((itemId) => !known[itemId]);
      if (missing.length === 0) return known;
      try {
        const { items: fetched } = await content.getItems(missing.slice(0, LESSON_SLOTS * 3));
        return { ...known, ...Object.fromEntries(fetched.map((fetchedItem) => [fetchedItem.id, fetchedItem])) };
      } catch {
        return known;
      }
    }

    async function loadLesson() {
      const cachedItems: Record<string, Item> = Object.fromEntries(Object.values(learning.lessons).flatMap((lesson) => lesson.items.map((cached) => [cached.id, cached])));
      let plan;
      let known = cachedItems;
      const resume = learning.resume?.lessonId === lessonId ? learning.resume.session : null;

      if (revision) {
        const candidates = revisionCandidates(learning.map, learning.progress, revision.units, today);
        plan = pickReviewItems(candidates, revision.length).map((itemId) => ({ kind: "item" as const, itemId, review: false }));
      } else if (challengeDate) {
        const finished = new Set(learning.progress.completedLessons.map((completed) => completed.lessonId));
        plan = dailyChallengeItemIds(learning.map?.units ?? [], finished, challengeDate).map((itemId) => ({ kind: "item" as const, itemId, review: false }));
      } else if (jumpTrack) {
        plan = jumpTestItemIds(learning.map?.units ?? [], jumpTrack).map((itemId) => ({ kind: "item" as const, itemId, review: false }));
      } else if (lessonId === REVIEW_SESSION_ID) {
        const reviewIds = pickReviewItems(dueReviewCandidates(learning.map, learning.progress, today), LESSON_SLOTS);
        plan = reviewIds.map((itemId) => ({ kind: "item" as const, itemId, review: true }));
      } else {
        let lesson = learning.lessons[lessonId];
        try {
          lesson = await content.getLesson(lessonId);
          dispatch(cacheLesson(lesson));
        } catch (error) {
          if (!lesson) throw error;
        }
        known = { ...known, ...Object.fromEntries(lesson.items.map((lessonItem) => [lessonItem.id, lessonItem])) };
        if (lesson.conceptCard) setConceptCard({ card: lesson.conceptCard, trace: lesson.conceptCardTrace });
        const candidates = reviewCandidatesFor(learning.map, learning.progress, lessonId, today);
        const mapLesson = learning.map?.units.flatMap((unit) => unit.lessons).find((candidate) => candidate.id === lessonId);
        if (lessonId === summaryLessonId(lesson.unit)) {
          const unit = learning.map?.units.find((candidate) => candidate.unit === lesson.unit);
          const own = lesson.items.map((lessonItem) => ({ itemId: lessonItem.id, concept: lessonItem.concept, due: false, mastery: 0, timesAnswered: learning.progress.timesAnswered[lessonItem.id] ?? 0 }));
          plan = unit ? buildSummaryLessonPlan(unit, own) : [];
        } else {
          plan = buildLessonPlan(mapLesson ?? { id: lessonId, title: null, concept: null, itemIds: lesson.items.map((lessonItem) => lessonItem.id) }, candidates);
        }
      }

      const planned = (resume?.slots ?? plan).flatMap((planned) => (planned.kind === "item" ? [planned.itemId] : []));
      known = await loadItemsById(planned, known);
      if (cancelled) return;
      // An item that is gone (flagged or retired) or unreachable offline is skipped; earlier attempts stay (PRD 17.1).
      const playable = (resume ?? startLessonSession(lessonId, plan)).slots.filter((planned) => planned.kind === "conceptCard" || known[planned.itemId]);
      const start = resume ? { ...resume, slots: playable, position: Math.min(resume.position, playable.length) } : startLessonSession(lessonId, playable, { test: isTest });
      setItems(known);
      setSession(start);
      setLoad(playable.length > 0 ? { status: "ready" } : { status: "error" });
    }

    loadLesson().catch((error: unknown) => {
      logError("[LEARN]", error, { phase: "load-lesson", lessonId });
      if (!cancelled) setLoad({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [challengeDate, dispatch, isTest, jumpTrack, lessonId, revision]);

  // A fresh draft for every new item on screen.
  useEffect(() => {
    if (item && !checked) setDraft((current) => current ?? emptyDraft(item));
  }, [checked, item]);

  const persistPlace = useCallback(
    (next: LessonSession) => {
      if (!isLesson) return;
      const resume = { lessonId, session: next };
      dispatch(saveResume(resume));
      if (!store.getState().session.isGuest) void new ProgressService().saveResume(resume).catch(() => undefined);
    },
    [dispatch, isLesson, lessonId],
  );

  const mood = recentResults.length === 0 ? 0 : recentResults.reduce((sum, correct) => sum + (correct ? 1 : -1), 0) / recentResults.length;

  const check = useCallback(async () => {
    if (!session || !item || !draft || !isDraftReady(item, draft) || checked) return;
    let correct: boolean;
    let optionIndex: number | null = null;
    let wrongLine = false;
    let codeVerdict: JudgeCodeResponse | null = null;
    const answer = draftToAnswer(item, draft);
    if (answer) {
      const verdict = checkItemAnswer(item, answer);
      correct = verdict.correct;
      optionIndex = verdict.optionIndex;
      wrongLine = verdict.wrongLine ?? false;
    } else {
      setJudging(true);
      try {
        codeVerdict = await new ContentService().judgeCode(item.id, draft.kind === "code" ? draft.source : "");
        correct = codeVerdict.passed;
      } catch {
        setJudging(false);
        throw new Error("offline");
      }
      setJudging(false);
    }
    const answered = answerCurrentItem(session, correct);
    const today = getStreakCalendarDate();
    dispatch(
      recordAttempt({
        attempt: {
          clientAttemptId: randomUUID(),
          itemId: item.id,
          itemVersion: item.version,
          correct,
          attemptNo: answered.attemptNo,
          optionIndex,
          usedHint: itemHintsUsed(hints, item.id),
          context: jumpTrack ? "JUMP_TEST" : challengeDate ? "DAILY_CHALLENGE" : revision ? "REVISION" : lessonId === REVIEW_SESSION_ID || (slot?.kind === "item" && slot.review) ? "REVIEW" : "LESSON",
          lessonId: isLesson ? lessonId : null,
          answeredAt: new Date().toISOString(),
        },
        concept: concepts.get(item.id) ?? item.concept,
        today,
        isGuest,
      }),
    );
    if (correct) haptic.success();
    else haptic.error();
    setRecentResults((previous) => [...previous.slice(-(MOOD_WINDOW - 1)), correct]);
    setSession(answered.session);
    setChecked({ outcome: answered.outcome, correct, optionIndex, wrongLine, codeVerdict });
  }, [challengeDate, checked, concepts, dispatch, draft, hints, isGuest, isLesson, item, jumpTrack, lessonId, revision, session, slot]);

  const finish = useCallback(
    (finished: LessonSession) => {
      const result = lessonResult(finished);
      const jumpPassed = jumpTrack !== null && isJumpTestPassed(result.firstAttemptCorrect, finished.slots.length);
      if (jumpTrack && jumpPassed) dispatch(recordJumpTestPass(jumpTrack));
      const challengeGrid = finished.slots.flatMap((played) => (played.kind === "item" ? [finished.items[played.itemId]?.firstAttemptCorrect ?? false] : []));
      if (challengeDate) dispatch(recordDailyChallenge({ result: { date: challengeDate, grid: challengeGrid }, today: getStreakCalendarDate(), isGuest }));
      if (isLesson) {
        dispatch(recordLessonCompletion({ lesson: { lessonId, flawless: result.flawless, accuracy: result.accuracy }, today: getStreakCalendarDate(), isGuest }));
        if (!isGuest) void new ProgressService().clearResume().catch(() => undefined);
      }
      void syncLearningProgress(dispatch, () => store.getState());
      const practised = [...new Set(Object.keys(finished.items).map((itemId) => concepts.get(itemId) ?? items[itemId]?.concept ?? ""))].filter(Boolean);
      return {
        accuracy: result.accuracy,
        flawless: result.flawless,
        xpEarned: store.getState().learning.progress.xpTotal - xpAtStart.current,
        concepts: practised,
        jumpPassed,
        ...(challengeDate ? { challengeGrid } : {}),
      };
    },
    [challengeDate, concepts, dispatch, isGuest, isLesson, items, jumpTrack, lessonId],
  );

  /** Moves on after the feedback sheet (or the concept card). Returns the lesson result once the lesson ends. */
  const proceed = useCallback(() => {
    if (!session) return null;
    if (checked?.outcome === "retry") {
      setChecked(null);
      if (item) setDraft(emptyDraft(item));
      return null;
    }
    const next = advanceLesson(session);
    setChecked(null);
    setDraft(null);
    setSession(next);
    if (isLessonFinished(next)) return finish(next);
    persistPlace(next);
    return null;
  }, [checked, finish, item, persistPlace, session]);

  /** `CODE_WRITE` offline: the item is skipped without an attempt and comes back another time. */
  const skipItem = useCallback(() => {
    if (!session) return null;
    const next = { ...session, position: session.position + 1 };
    setDraft(null);
    setSession(next);
    return isLessonFinished(next) ? finish(next) : null;
  }, [finish, session]);

  const openHint = useCallback(() => {
    if (!item) return;
    setHints((previous) => ({ ...previous, [item.id]: Math.min(3, itemHintsUsed(previous, item.id) + 1) }));
  }, [item]);

  const leave = useCallback(() => {
    if (session && !isLessonFinished(session)) persistPlace(session);
  }, [persistPlace, session]);

  const isOnline = useCallback(async () => (await NetInfo.fetch()).isConnected !== false, []);

  return {
    load,
    session,
    slot,
    item,
    conceptCard,
    draft,
    setDraft,
    checked,
    judging,
    hintsOpened: item ? itemHintsUsed(hints, item.id) : 0,
    openHint,
    check,
    proceed,
    skipItem,
    leave,
    isOnline,
    mood,
    progress: session ? lessonProgress(session) : { completed: 0, total: 0 },
    outputLines: item?.variant === "ORDER_OUTPUT" ? shuffledOutputLines(item) : [],
  };
}
