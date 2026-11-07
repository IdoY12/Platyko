-- Exercises before a user's resume index were paid before completedExerciseIds existed: record them,
-- so the once-per-exercise rule also holds for progress made before 20261106000001.
UPDATE "UserProgress" AS up
SET "completedExerciseIds" = COALESCE(
  (SELECT array_agg(e."id") FROM "Exercise" AS e
   WHERE e."experienceLevel" = up."experienceLevel" AND e."orderIndex" < up."currentExerciseIndex"),
  ARRAY[]::TEXT[])
WHERE COALESCE(cardinality(up."completedExerciseIds"), 0) = 0 AND up."currentExerciseIndex" > 0;
