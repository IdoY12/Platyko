import type { LessonResume } from "@project/api-contract";
import type { LearnerProgress, ProgressSnapshot } from "@project/learning-logic";

/** The progress shape the skill-map rules read, from what the learning slice stores. */
export function learnerProgressOf(progress: ProgressSnapshot, resume: LessonResume | null): LearnerProgress {
  return {
    completedLessonIds: new Set(progress.completedLessons.map((lesson) => lesson.lessonId)),
    inProgressLessonId: resume?.lessonId ?? null,
    masteryByConcept: Object.fromEntries(progress.concepts.map((concept) => [concept.concept, concept.score])),
    jumpedTracks: new Set(progress.jumpedTracks),
  };
}
