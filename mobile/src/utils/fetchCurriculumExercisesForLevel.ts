import type Exercise from "@/models/Exercise";
import type { Experience } from "@/redux/profile-slice";
import { setCachedExercisesForLevel } from "@/redux/lesson-slice";
import store from "@/redux/store";
import LearningService from "@/services/auth-aware/LearningService";

/**
 * Returns the curriculum exercise list for one level, using the lesson slice as a session cache
 * so repeat visits do not call GET /learning/exercises/:experienceLevel again.
 */
export async function fetchCurriculumExercisesForLevel(experienceLevel: Experience): Promise<Exercise[]> {
  const cached = store.getState().lesson.exercisesByExperienceLevel[experienceLevel];
  if (cached && cached.length > 0) {
    return cached;
  }
  const learning = new LearningService();
  const exercises = await learning.getExercisesForLevel(experienceLevel);
  store.dispatch(setCachedExercisesForLevel({ experienceLevel, exercises }));
  return exercises;
}
