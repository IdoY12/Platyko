import type { ConceptCard, Item, ItemTrace } from "@project/content-model";
import type { AttemptRecord, LessonSession, MapUnit, ProgressSnapshot } from "@project/learning-logic";

/**
 * Request and response shapes of the learning API, shared by the backend and the app so the two
 * cannot drift. Paths are relative to `/api`.
 */

/** `GET /content/map` — the whole skill map without item content (PRD 15.8). Public. */
export type ContentMapResponse = {
  /** Hash of the loaded bank; the app drops its cached lessons when it changes. */
  bankHash: string;
  units: MapUnit[];
};

/** `GET /content/lessons/:lessonId` — one lesson's concept card and new items. Public. */
export type LessonContentResponse = {
  lessonId: string;
  unit: string;
  /** Null for a unit's summary lesson. */
  conceptCard: ConceptCard | null;
  conceptCardTrace: ItemTrace | null;
  items: Item[];
};

/** `GET /content/items?ids=a,b` — items by id, for review, summary lessons and the daily challenge. Public. */
export type ItemsResponse = { items: Item[] };
export const MAX_ITEMS_PER_REQUEST = 24;

/** `POST /content/items/:itemId/judge` — runs a `CODE_WRITE` answer in the server sandbox. Public, rate limited. */
export type JudgeCodeRequest = { source: string };
export type JudgeCodeResponse = {
  passed: boolean;
  /** 0-based index of the first failed test; null when all passed. */
  failedTestIndex: number | null;
  failure: "wrong-result" | "runtime-error" | "timeout" | "syntax-error" | null;
};
export const MAX_JUDGED_SOURCE_LENGTH = 4000;

export type CompletedLessonReport = { lessonId: string; flawless: boolean; accuracy: number };

/** A lesson left half-way, so "Continue" returns to the same item (PRD 17.1). */
export type LessonResume = { lessonId: string; session: LessonSession };

export type LearningGoals = { weeklyGoalDays: number; dailyGoalLessons: number };

/** `GET /progress` — a registered learner's progress. */
export type ProgressResponse = {
  progress: ProgressSnapshot;
  level: number;
  resume: LessonResume | null;
  goals: LearningGoals;
};

/**
 * `POST /progress/attempts` — a batch of attempts, sent at the end of a lesson or when the
 * network returns. The server recomputes XP, mastery, review dates and the streak from it;
 * attempts already stored (same `clientAttemptId`) are ignored.
 */
export type SubmitProgressRequest = {
  /** The device's calendar date, YYYY-MM-DD. */
  clientLocalDate: string;
  attempts: AttemptRecord[];
  completedLessons: CompletedLessonReport[];
};
export type SubmitProgressResponse = ProgressResponse & { xpEarned: number };
export const MAX_ATTEMPTS_PER_BATCH = 200;

/** `PUT /progress/resume` stores the lesson in progress; `DELETE /progress/resume` clears it. */
export type SaveResumeRequest = LessonResume;

/**
 * `POST /progress/guest-merge` — what a guest's device sends after the guest registers or logs in by any method (PRD 10.2):
 * the attempts and finished lessons, never an XP number. The server recomputes everything and
 * merges it into the account.
 */
export type GuestProgressUpload = { clientLocalDate: string; attempts: AttemptRecord[]; completedLessons: CompletedLessonReport[] };
export const MAX_GUEST_ATTEMPTS = 3000;

/** `POST /content/items/:itemId/feedback` — a vote after the explanation, or a report (PRD 7.6). Registered users. */
export const ITEM_REPORT_REASONS = ["WRONG_ANSWER", "UNCLEAR", "TYPO", "OTHER"] as const;
export type ItemReportReason = (typeof ITEM_REPORT_REASONS)[number];
export type ItemFeedbackRequest = { vote?: 1 | -1; reportReason?: ItemReportReason };
