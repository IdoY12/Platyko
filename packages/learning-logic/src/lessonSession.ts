import { attemptOutcome, lessonAccuracy, MAX_ATTEMPTS_PER_ITEM, type AttemptOutcome } from "./attempts.js";
import type { LessonSlot } from "./lessonPlan.js";

/**
 * The state of a lesson being played (PRD 6.4, 6.5, 16.3). It is plain data, so it can be saved
 * when the learner leaves and restored on "Continue". An item answered wrongly on its first
 * attempt comes back once at the end of the lesson.
 */

export type ItemProgress = {
  /** Attempts made in the current visit to the item (1 or 2). */
  attempts: number;
  /** How the first visit ended; null while the item is still open. */
  firstVisit: AttemptOutcome | null;
  firstAttemptCorrect: boolean;
  /** The item has already been queued to return at the end. */
  returned: boolean;
};

export type LessonSession = {
  lessonId: string;
  /** The plan plus any returned items appended at the end. */
  slots: LessonSlot[];
  position: number;
  items: Record<string, ItemProgress>;
};

export function startLessonSession(lessonId: string, plan: readonly LessonSlot[]): LessonSession {
  return { lessonId, slots: [...plan], position: 0, items: {} };
}

export function currentSlot(session: LessonSession): LessonSlot | null {
  return session.slots[session.position] ?? null;
}

export function isLessonFinished(session: LessonSession): boolean {
  return session.position >= session.slots.length;
}

/** True when the slot at `position` is a second visit to an item that went wrong earlier. */
function isReturnVisit(session: LessonSession, position: number): boolean {
  const slot = session.slots[position];
  if (slot?.kind !== "item") return false;
  return session.slots.findIndex((candidate) => candidate.kind === "item" && candidate.itemId === slot.itemId) < position;
}

/**
 * Records one answer to the current item and says what the player shows next. The attempt
 * number to record with the answer is `attemptNo`; a return visit continues the count, so an
 * item is never paid as a first attempt twice.
 */
export function answerCurrentItem(session: LessonSession, correct: boolean): { session: LessonSession; outcome: AttemptOutcome; attemptNo: number } {
  const slot = currentSlot(session);
  if (slot?.kind !== "item") throw new Error("The current slot is not an item.");
  const returning = isReturnVisit(session, session.position);
  const previous = session.items[slot.itemId] ?? { attempts: 0, firstVisit: null, firstAttemptCorrect: false, returned: false };
  const visitAttempt = (returning ? previous.attempts - MAX_ATTEMPTS_PER_ITEM : previous.attempts) + 1;
  const outcome = attemptOutcome(visitAttempt, correct);
  const progress: ItemProgress = {
    ...previous,
    attempts: returning ? MAX_ATTEMPTS_PER_ITEM + visitAttempt : visitAttempt,
    firstAttemptCorrect: previous.firstAttemptCorrect || (!returning && visitAttempt === 1 && correct),
    firstVisit: returning ? previous.firstVisit : outcome === "retry" ? null : outcome,
  };
  return { session: { ...session, items: { ...session.items, [slot.itemId]: progress } }, outcome, attemptNo: progress.attempts };
}

/** Moves to the next slot; an item whose first attempt was wrong is queued once at the end. */
export function advanceLesson(session: LessonSession): LessonSession {
  const slot = currentSlot(session);
  if (slot?.kind !== "item") return { ...session, position: session.position + 1 };
  const progress = session.items[slot.itemId];
  const shouldReturn = progress !== undefined && !progress.firstAttemptCorrect && !progress.returned;
  if (!shouldReturn) return { ...session, position: session.position + 1 };
  return {
    ...session,
    position: session.position + 1,
    slots: [...session.slots, { kind: "item", itemId: slot.itemId, review: slot.review }],
    items: { ...session.items, [slot.itemId]: { ...progress, attempts: MAX_ATTEMPTS_PER_ITEM, returned: true } },
  };
}

export type LessonResult = {
  itemsAnswered: number;
  firstAttemptCorrect: number;
  /** Whole percentage; 100 only when every item was right at once. */
  accuracy: number;
  flawless: boolean;
};

export function lessonResult(session: LessonSession): LessonResult {
  const items = Object.values(session.items);
  const firstAttemptCorrect = items.filter((item) => item.firstAttemptCorrect).length;
  return {
    itemsAnswered: items.length,
    firstAttemptCorrect,
    accuracy: lessonAccuracy(firstAttemptCorrect, items.length),
    flawless: items.length > 0 && firstAttemptCorrect === items.length,
  };
}

/** How many of the lesson's slots are behind the learner, for the progress bar. */
export function lessonProgress(session: LessonSession): { completed: number; total: number } {
  return { completed: Math.min(session.position, session.slots.length), total: session.slots.length };
}
