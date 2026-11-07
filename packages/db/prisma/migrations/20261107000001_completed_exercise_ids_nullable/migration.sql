-- Prisma models String[] as a nullable column with a default; align the column created by 20261106000001.
ALTER TABLE "UserProgress" ALTER COLUMN "completedExerciseIds" DROP NOT NULL;
