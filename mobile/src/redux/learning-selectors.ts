import type { ContentMapResponse, LessonResume } from "@project/api-contract";
import { earnedAchievements, learningFacts, type LearnerProgress, type ProgressSnapshot } from "@project/learning-logic";

/** The progress shape the skill-map rules read, from what the learning slice stores. */
export function learnerProgressOf(progress: ProgressSnapshot, resume: LessonResume | null): LearnerProgress {
  return {
    completedLessonIds: new Set(progress.completedLessons.map((lesson) => lesson.lessonId)),
    inProgressLessonId: resume?.lessonId ?? null,
    masteryByConcept: Object.fromEntries(progress.concepts.map((concept) => [concept.concept, concept.score])),
    jumpedTracks: new Set(progress.jumpedTracks),
  };
}

/** The badges the learner has earned, with the rules the server records them with (PRD 14.2). */
export function earnedAchievementCodes(progress: ProgressSnapshot, map: ContentMapResponse | null): Set<string> {
  return new Set(earnedAchievements(learningFacts(progress, map?.units ?? [])));
}
