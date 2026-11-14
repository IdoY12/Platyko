import { LESSON_SLOTS } from "@project/content-model";
import type { MapLesson, MapUnit } from "./skillMap.js";

/**
 * What a lesson contains (PRD 6.4): an ungraded concept card, the lesson's new items in PRIMM
 * order, then review items from earlier concepts up to eight slots (interleaving). The unit's
 * summary lesson has no card and draws eight items from the whole unit, weakest concepts first.
 */

export type LessonSlot = { kind: "conceptCard" } | { kind: "item"; itemId: string; review: boolean };

/** An item from an earlier concept that could fill a review slot. */
export type ReviewCandidate = {
  itemId: string;
  concept: string;
  /** The concept's review is due today or overdue. */
  due: boolean;
  /** 0 to 100. */
  mastery: number;
  /** How many times the learner has answered this item; unseen items are preferred. */
  timesAnswered: number;
};

function byReviewPriority(left: ReviewCandidate, right: ReviewCandidate): number {
  return Number(right.due) - Number(left.due) || left.mastery - right.mastery || left.timesAnswered - right.timesAnswered || (left.itemId < right.itemId ? -1 : 1);
}

/** Picks `count` review items: due concepts first, then the weakest, one item per concept while concepts last. */
export function pickReviewItems(candidates: readonly ReviewCandidate[], count: number, excludedItemIds: ReadonlySet<string> = new Set()): string[] {
  const pool = candidates.filter((candidate) => !excludedItemIds.has(candidate.itemId)).sort(byReviewPriority);
  const picked: ReviewCandidate[] = [];
  const usedConcepts = new Set<string>();
  for (const candidate of pool) {
    if (picked.length === count) break;
    if (usedConcepts.has(candidate.concept)) continue;
    picked.push(candidate);
    usedConcepts.add(candidate.concept);
  }
  for (const candidate of pool) {
    if (picked.length === count) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  return picked.map((candidate) => candidate.itemId);
}

export function buildLessonPlan(lesson: MapLesson, reviewCandidates: readonly ReviewCandidate[]): LessonSlot[] {
  const reviewSlots = Math.max(0, LESSON_SLOTS - 1 - lesson.itemIds.length);
  const reviewItemIds = pickReviewItems(reviewCandidates, reviewSlots, new Set(lesson.itemIds));
  return [
    { kind: "conceptCard" },
    ...lesson.itemIds.map((itemId): LessonSlot => ({ kind: "item", itemId, review: false })),
    ...reviewItemIds.map((itemId): LessonSlot => ({ kind: "item", itemId, review: true })),
  ];
}

/** The summary lesson: eight of the unit's own items, spread over its concepts, weakest first. */
export function buildSummaryLessonPlan(unit: MapUnit, candidates: readonly ReviewCandidate[]): LessonSlot[] {
  const unitItemIds = new Set(unit.lessons.flatMap((lesson) => lesson.itemIds));
  const ownItems = candidates.filter((candidate) => unitItemIds.has(candidate.itemId));
  return pickReviewItems(ownItems, LESSON_SLOTS).map((itemId): LessonSlot => ({ kind: "item", itemId, review: true }));
}
