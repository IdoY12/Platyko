import type { ContentMapResponse } from "@project/api-contract";
import type { ProgressSnapshot, ReviewCandidate } from "@project/learning-logic";

/**
 * Review candidates for a lesson's free slots: the items of lessons the learner has finished,
 * other than this one, with their concept's mastery and review date (PRD 6.4, 6.7).
 */
export function reviewCandidatesFor(map: ContentMapResponse | null, progress: ProgressSnapshot, excludedLessonId: string, today: string): ReviewCandidate[] {
  if (!map) return [];
  const finished = new Set(progress.completedLessons.map((lesson) => lesson.lessonId));
  const conceptProgress = new Map(progress.concepts.map((concept) => [concept.concept, concept]));
  return map.units.flatMap((unit) =>
    unit.lessons
      .filter((lesson) => lesson.concept !== null && lesson.id !== excludedLessonId && finished.has(lesson.id))
      .flatMap((lesson) =>
        lesson.itemIds.map((itemId) => {
          const concept = conceptProgress.get(lesson.concept ?? "");
          return {
            itemId,
            concept: lesson.concept ?? "",
            due: concept?.dueDate !== null && concept?.dueDate !== undefined && concept.dueDate <= today,
            mastery: concept?.score ?? 0,
            timesAnswered: progress.timesAnswered[itemId] ?? 0,
          };
        }),
      ),
  );
}

/** The concept every item of the map belongs to, for recording attempts. */
export function conceptByItemId(map: ContentMapResponse | null): Map<string, string> {
  const concepts = new Map<string, string>();
  for (const unit of map?.units ?? []) {
    for (const lesson of unit.lessons) for (const itemId of lesson.itemIds) if (lesson.concept) concepts.set(itemId, lesson.concept);
  }
  return concepts;
}

/** Items of concepts due for review today, one per concept while concepts last, for the Review session. */
export function dueReviewCandidates(map: ContentMapResponse | null, progress: ProgressSnapshot, today: string): ReviewCandidate[] {
  return reviewCandidatesFor(map, progress, "", today).filter((candidate) => candidate.due);
}
