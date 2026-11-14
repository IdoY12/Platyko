import type { ExperienceLevel } from "@prisma/client";

/** `content/migration/legacy-item-map.json`: legacy content key -> id of the item that replaced it. */
type LegacyItemMap = Record<string, string>;

type LegacyExercise = { id: string; experienceLevel: ExperienceLevel; orderIndex: number };
type LegacyPuzzle = { id: number; orderIndex: number };

/** What one user finished in the legacy model: paid exercises and puzzles solved at least once. */
export type LegacyUserCompletions = { userId: string; completedExerciseIds: string[]; solvedPuzzleIds: string[] };

type MigratedAttempt = { userId: string; itemId: string; itemVersion: number; clientAttemptId: string };

type LegacyCompletionPlan = { attempts: MigratedAttempt[]; problems: string[] };

export function exerciseMapKey(experienceLevel: ExperienceLevel, orderIndex: number): string {
  return `exercise:${experienceLevel}:${orderIndex}`;
}

export function puzzleMapKey(orderIndex: number): string {
  return `puzzle:${orderIndex}`;
}

/** Idempotency key of a migrated attempt: one per user and item, however often the script runs. */
export function legacyClientAttemptId(userId: string, itemId: string): string {
  return `legacy:${userId}:${itemId}`;
}

/**
 * Resolves every legacy completion to the item that replaced it. Each completion that cannot be
 * resolved becomes a problem, so the caller can refuse to write a partial history.
 */
export function planLegacyCompletionAttempts(input: {
  users: LegacyUserCompletions[];
  exercises: LegacyExercise[];
  puzzles: LegacyPuzzle[];
  itemMap: LegacyItemMap;
  /** Version of every item that exists in the `Item` table. */
  itemVersions: ReadonlyMap<string, number>;
}): LegacyCompletionPlan {
  const exerciseKeys = new Map(
    input.exercises.map((exercise) => [exercise.id, exerciseMapKey(exercise.experienceLevel, exercise.orderIndex)]),
  );
  const puzzleKeys = new Map(input.puzzles.map((puzzle) => [String(puzzle.id), puzzleMapKey(puzzle.orderIndex)]));
  const attempts = new Map<string, MigratedAttempt>();
  const problems = new Set<string>();

  const planAttempt = (userId: string, mapKey: string | undefined, legacyDescription: string): void => {
    if (!mapKey) {
      problems.add(`${legacyDescription} of user ${userId} no longer exists, so it has no map key`);
      return;
    }
    const itemId = input.itemMap[mapKey];
    if (!itemId) {
      problems.add(`"${mapKey}" is not in the legacy item map`);
      return;
    }
    const itemVersion = input.itemVersions.get(itemId);
    if (itemVersion === undefined) {
      problems.add(`item "${itemId}" (mapped from "${mapKey}") is missing from the Item table`);
      return;
    }
    const clientAttemptId = legacyClientAttemptId(userId, itemId);
    attempts.set(clientAttemptId, { userId, itemId, itemVersion, clientAttemptId });
  };

  for (const user of input.users) {
    for (const exerciseId of user.completedExerciseIds) {
      planAttempt(user.userId, exerciseKeys.get(exerciseId), `exercise ${exerciseId}`);
    }
    for (const puzzleId of user.solvedPuzzleIds) {
      planAttempt(user.userId, puzzleKeys.get(puzzleId), `puzzle ${puzzleId}`);
    }
  }
  return { attempts: [...attempts.values()], problems: [...problems] };
}
