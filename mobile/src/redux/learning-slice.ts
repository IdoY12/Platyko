import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CompletedLessonReport, ContentMapResponse, LearningGoals, LessonContentResponse, LessonResume, ProgressResponse } from "@project/api-contract";
import { MAX_GUEST_ATTEMPTS } from "@project/api-contract";
import type { Track } from "@project/content-model";
import { applyAttempt, applyLessonCompletion, EMPTY_PROGRESS, withJumpedTrack, type AttemptRecord, type ProgressSnapshot } from "@project/learning-logic";

/**
 * Everything the learning screens read. Attempts apply here at once with the same rules the
 * server uses, so feedback is instant and works offline; the queue is sent when the network
 * allows, and the server's answer then replaces the local progress (it is the source of truth
 * for a registered learner). A guest keeps the full attempt history, which is uploaded when the
 * guest registers or logs in (PRD 10.2).
 */
export type LearningState = {
  map: ContentMapResponse | null;
  /** Lessons opened before, kept for offline use (PRD 16.10). */
  lessons: Record<string, LessonContentResponse>;
  progress: ProgressSnapshot;
  resume: LessonResume | null;
  goals: LearningGoals;
  /** The track the learner said they know in onboarding; a jump test is offered for any but the first. */
  startingTrack: Track | null;
  /** Not yet accepted by the server, with what is needed to apply them again on top of its answer. */
  pendingAttempts: PendingAttempt[];
  pendingLessons: PendingLesson[];
  /** A guest's every attempt and finished lesson, for the upload on sign-up. */
  guestHistory: { attempts: AttemptRecord[]; lessons: CompletedLessonReport[] };
  lastSyncedAt: string | null;
};

type PendingAttempt = { attempt: AttemptRecord; concept: string; today: string };
type PendingLesson = { lesson: CompletedLessonReport; today: string };

const MAX_CACHED_LESSONS = 40;

/** Applies attempts and finished lessons that the server has not seen yet, in the order they happened. */
function replayPending(progress: ProgressSnapshot, attempts: readonly PendingAttempt[], lessons: readonly PendingLesson[]): ProgressSnapshot {
  const afterAttempts = attempts.reduce((current, pending) => applyAttempt(current, pending.attempt, pending.concept, pending.today).snapshot, progress);
  return lessons.reduce((current, pending) => applyLessonCompletion(current, pending.lesson, pending.today).snapshot, afterAttempts);
}

const initialState: LearningState = {
  map: null,
  lessons: {},
  progress: EMPTY_PROGRESS,
  resume: null,
  goals: { weeklyGoalDays: 5, dailyGoalLessons: 1 },
  startingTrack: null,
  pendingAttempts: [],
  pendingLessons: [],
  guestHistory: { attempts: [], lessons: [] },
  lastSyncedAt: null,
};

type RecordAttemptPayload = { attempt: AttemptRecord; concept: string; today: string; isGuest: boolean };
type RecordLessonPayload = { lesson: CompletedLessonReport; today: string; isGuest: boolean };

const learningSlice = createSlice({
  name: "learning",
  initialState,
  reducers: {
    hydrateLearning: (state, action: PayloadAction<Partial<LearningState>>) => ({ ...state, ...action.payload }),
    resetLearning: () => initialState,
    setContentMap: (state, action: PayloadAction<ContentMapResponse>) => {
      // A new bank invalidates every cached lesson: item ids or answers may have changed.
      if (state.map && state.map.bankHash !== action.payload.bankHash) state.lessons = {};
      state.map = action.payload;
    },
    cacheLesson: (state, action: PayloadAction<LessonContentResponse>) => {
      state.lessons[action.payload.lessonId] = action.payload;
      const cachedIds = Object.keys(state.lessons);
      for (const staleId of cachedIds.slice(0, Math.max(0, cachedIds.length - MAX_CACHED_LESSONS))) delete state.lessons[staleId];
    },
    recordAttempt: (state, action: PayloadAction<RecordAttemptPayload>) => {
      const { attempt, concept, today, isGuest } = action.payload;
      state.progress = applyAttempt(state.progress, attempt, concept, today).snapshot;
      state.pendingAttempts.push({ attempt, concept, today });
      if (isGuest && state.guestHistory.attempts.length < MAX_GUEST_ATTEMPTS) state.guestHistory.attempts.push(attempt);
    },
    recordLessonCompletion: (state, action: PayloadAction<RecordLessonPayload>) => {
      const { lesson, today, isGuest } = action.payload;
      state.progress = applyLessonCompletion(state.progress, lesson, today).snapshot;
      state.pendingLessons.push({ lesson, today });
      if (isGuest) state.guestHistory.lessons.push(lesson);
      if (state.resume?.lessonId === lesson.lessonId) state.resume = null;
    },
    setOnboardingChoices: (state, action: PayloadAction<{ startingTrack: Track; weeklyGoalDays: number }>) => {
      state.startingTrack = action.payload.startingTrack;
      state.goals.weeklyGoalDays = action.payload.weeklyGoalDays;
    },
    /** A passed jump test opens its track at once; for an account the server confirms it on sync. */
    recordJumpTestPass: (state, action: PayloadAction<Track>) => {
      state.progress = withJumpedTrack(state.progress, action.payload);
    },
    saveResume: (state, action: PayloadAction<LessonResume | null>) => {
      state.resume = action.payload;
    },
    /** The server accepted a batch: its progress replaces the local one, and the sent items leave the queue. */
    applyServerProgress: (state, action: PayloadAction<{ response: ProgressResponse; sentAttemptIds: string[]; sentLessonIds: string[] }>) => {
      const { response, sentAttemptIds, sentLessonIds } = action.payload;
      const sentAttempts = new Set(sentAttemptIds);
      const sentLessons = new Set(sentLessonIds);
      state.pendingAttempts = state.pendingAttempts.filter((pending) => !sentAttempts.has(pending.attempt.clientAttemptId));
      state.pendingLessons = state.pendingLessons.filter((pending) => !sentLessons.has(pending.lesson.lessonId));
      // Attempts made while the request was in flight are applied again on top of the server's state.
      state.progress = replayPending(response.progress, state.pendingAttempts, state.pendingLessons);
      state.resume = response.resume ?? state.resume;
      state.goals = response.goals;
      state.lastSyncedAt = new Date().toISOString();
    },
    /**
     * A guest signed in: the guest's progress leaves the screen and the queue (the server's
     * progress replaces it on the next sync), but the history stays until the learner decides
     * whether to bring it into the account.
     */
    startAccountSession: (state) => {
      state.progress = EMPTY_PROGRESS;
      state.resume = null;
      state.pendingAttempts = [];
      state.pendingLessons = [];
      state.lastSyncedAt = null;
    },
    /** After a guest's history reached the account, or the learner declined, it is no longer needed. */
    clearGuestHistory: (state) => {
      state.guestHistory = { attempts: [], lessons: [] };
    },
  },
});

export const {
  hydrateLearning,
  resetLearning,
  setContentMap,
  cacheLesson,
  recordAttempt,
  recordLessonCompletion,
  setOnboardingChoices,
  recordJumpTestPass,
  saveResume,
  applyServerProgress,
  startAccountSession,
  clearGuestHistory,
} = learningSlice.actions;

export default learningSlice.reducer;
