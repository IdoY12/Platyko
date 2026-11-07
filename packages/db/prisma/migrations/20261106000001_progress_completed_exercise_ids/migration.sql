-- Lesson XP is paid once per exercise; the ids that already paid live on the progress row.
ALTER TABLE "UserProgress" ADD COLUMN "completedExerciseIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
