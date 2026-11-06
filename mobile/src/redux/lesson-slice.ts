import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type Exercise from "@/models/Exercise";

const lessonResumeSyncedLevels = new Set<string>();

/** Session-only: first successful GET /learning/resume per level; cleared by resetLesson. Not persisted. */
export const lessonResumeSync = {
  has: (level: string) => lessonResumeSyncedLevels.has(level),
  mark: (level: string) => {
    lessonResumeSyncedLevels.add(level);
  },
};

/** Stable key used to store/retrieve progress for one level × block combination. */
export const blockProgressKey = (level: string, blockIndex: number) => `${level}_block${blockIndex}`;

interface LessonState {
  currentExperienceLevel: string;
  lessonExerciseIndex: number;
  /** Maps blockProgressKey → last question index the user reached (0-based). */
  blockProgress: Record<string, number>;
  /** Session cache (not persisted): full curriculum list per level, avoids repeat GET /learning/exercises. */
  exercisesByExperienceLevel: Partial<Record<string, Exercise[]>>;
}

const initialState: LessonState = {
  currentExperienceLevel: "JUNIOR",
  lessonExerciseIndex: 0,
  blockProgress: {},
  exercisesByExperienceLevel: {},
};

const lessonSlice = createSlice({
  name: "lesson",
  initialState,
  reducers: {
    setCurrentExperienceLevel: (state, action: PayloadAction<string>) => {
      state.currentExperienceLevel = action.payload;
    },
    setExerciseIndex: (state, action: PayloadAction<number>) => {
      state.lessonExerciseIndex = action.payload;
    },
    saveBlockProgress: (state, action: PayloadAction<{ level: string; blockIndex: number; exerciseIndex: number }>) => {
      const { level, blockIndex, exerciseIndex } = action.payload;
      state.blockProgress[blockProgressKey(level, blockIndex)] = exerciseIndex;
    },
    resetBlockProgress: (state, action: PayloadAction<{ level: string; blockIndex: number }>) => {
      const { level, blockIndex } = action.payload;
      delete state.blockProgress[blockProgressKey(level, blockIndex)];
    },
    setCachedExercisesForLevel: (state, action: PayloadAction<{ experienceLevel: string; exercises: Exercise[] }>) => {
      state.exercisesByExperienceLevel[action.payload.experienceLevel] = action.payload.exercises;
    },
    hydrateLesson: (state, action: PayloadAction<Partial<LessonState>>) => {
      Object.assign(state, action.payload);
    },
    resetLesson: () => {
      lessonResumeSyncedLevels.clear();
      return initialState;
    },
  },
});

export const {
  setCurrentExperienceLevel,
  setExerciseIndex,
  saveBlockProgress,
  resetBlockProgress,
  setCachedExercisesForLevel,
  hydrateLesson,
  resetLesson,
} = lessonSlice.actions;

export default lessonSlice.reducer;
