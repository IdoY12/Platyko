import type { Experience } from "@/redux/profile-slice";
import { lessonResumeSync } from "@/redux/lesson-slice";
import LearningService from "@/services/auth-aware/LearningService";
import { fetchCurriculumExercisesForLevel } from "@/utils/fetchCurriculumExercisesForLevel";
import { applyLessonExercisePayload, type LessonExerciseSetters } from "@/utils/lessonExerciseState";
import { logError, logTasks } from "@/utils/logger";

const EXERCISES_PER_BLOCK = 10;

export async function runLessonExerciseLoad(
  experienceLevel: Experience,
  jwt: string | null,
  blockIndex: number,
  savedLocalIndex: number,
  active: () => boolean,
  setLoading: (v: boolean) => void,
  set: LessonExerciseSetters,
): Promise<void> {
  setLoading(true);
  set.setLoadError(false);

  try {
    const allExercises = await fetchCurriculumExercisesForLevel(experienceLevel, jwt);
    const blockStart = blockIndex * EXERCISES_PER_BLOCK;
    const blockExercises = allExercises.slice(blockStart, blockStart + EXERCISES_PER_BLOCK);

    // Local progress is the baseline; server resume overrides for authenticated users.
    let startIndex =
      savedLocalIndex > 0 && savedLocalIndex < blockExercises.length ? savedLocalIndex : 0;

    if (jwt && !lessonResumeSync.has(experienceLevel)) {
      try {
        const learning = new LearningService();
        const resume = await learning.getResumeForLevel(experienceLevel);
        lessonResumeSync.mark(experienceLevel);
        const resumeWithinBlock = resume.currentExerciseIndex - blockStart;
        if (resumeWithinBlock > 0 && resumeWithinBlock < blockExercises.length) {
          startIndex = resumeWithinBlock;
        }
      } catch {
        // server resume is best-effort; local progress already applied above
      }
    }

    logTasks("lesson:block-resolved", { experienceLevel, blockIndex, count: blockExercises.length, startIndex });

    if (active()) applyLessonExercisePayload(set, blockExercises, startIndex);
  } catch (e) {
    logError("[TASKS]", e, { phase: "load-exercises", experienceLevel, blockIndex });
    if (active()) set.setLoadError(true);
  } finally {
    if (active()) setLoading(false);
  }
}
