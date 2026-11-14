import { describe, expect, it } from "vitest";
import {
  exerciseMapKey,
  legacyClientAttemptId,
  planLegacyCompletionAttempts,
  puzzleMapKey,
  type LegacyUserCompletions,
} from "./legacyCompletionMapping.js";

const exercises = [
  { id: "exercise-junior-0", experienceLevel: "JUNIOR" as const, orderIndex: 0 },
  { id: "exercise-junior-1", experienceLevel: "JUNIOR" as const, orderIndex: 1 },
  { id: "exercise-mid-0", experienceLevel: "MID" as const, orderIndex: 0 },
];
const puzzles = [{ id: 7, orderIndex: 3 }];
const itemMap = {
  "exercise:JUNIOR:0": "beg.variables.let.predict-01",
  "exercise:JUNIOR:1": "beg.variables.const.fix-01",
  "exercise:MID:0": "beg.variables.let.predict-01",
  "puzzle:3": "int.arrays.map.write-01",
};
const itemVersions = new Map([
  ["beg.variables.let.predict-01", 2],
  ["beg.variables.const.fix-01", 1],
  ["int.arrays.map.write-01", 4],
]);

function plan(users: LegacyUserCompletions[], overrides: Partial<Parameters<typeof planLegacyCompletionAttempts>[0]> = {}) {
  return planLegacyCompletionAttempts({ users, exercises, puzzles, itemMap, itemVersions, ...overrides });
}

describe("legacy map keys", () => {
  it("match the key format of the legacy item map", () => {
    expect(exerciseMapKey("SENIOR", 12)).toBe("exercise:SENIOR:12");
    expect(puzzleMapKey(3)).toBe("puzzle:3");
    expect(legacyClientAttemptId("user-1", "beg.variables.let.predict-01")).toBe("legacy:user-1:beg.variables.let.predict-01");
  });
});

describe("planLegacyCompletionAttempts", () => {
  it("turns completed exercises and solved puzzles into one attempt per item", () => {
    const { attempts, problems } = plan([
      { userId: "user-1", completedExerciseIds: ["exercise-junior-1"], solvedPuzzleIds: ["7"] },
    ]);

    expect(problems).toEqual([]);
    expect(attempts).toEqual([
      { userId: "user-1", itemId: "beg.variables.const.fix-01", itemVersion: 1, clientAttemptId: "legacy:user-1:beg.variables.const.fix-01" },
      { userId: "user-1", itemId: "int.arrays.map.write-01", itemVersion: 4, clientAttemptId: "legacy:user-1:int.arrays.map.write-01" },
    ]);
  });

  it("merges two legacy exercises that became the same item, per user", () => {
    const { attempts } = plan([
      { userId: "user-1", completedExerciseIds: ["exercise-junior-0", "exercise-mid-0"], solvedPuzzleIds: [] },
      { userId: "user-2", completedExerciseIds: ["exercise-mid-0"], solvedPuzzleIds: [] },
    ]);

    expect(attempts.map((attempt) => attempt.clientAttemptId)).toEqual([
      "legacy:user-1:beg.variables.let.predict-01",
      "legacy:user-2:beg.variables.let.predict-01",
    ]);
  });

  it("reports a legacy key that the map does not cover, once", () => {
    const { attempts, problems } = plan(
      [
        { userId: "user-1", completedExerciseIds: ["exercise-junior-1"], solvedPuzzleIds: [] },
        { userId: "user-2", completedExerciseIds: ["exercise-junior-1"], solvedPuzzleIds: [] },
      ],
      { itemMap: {} },
    );

    expect(attempts).toEqual([]);
    expect(problems).toEqual(['"exercise:JUNIOR:1" is not in the legacy item map']);
  });

  it("reports a mapped item that is missing from the Item table", () => {
    const { attempts, problems } = plan([{ userId: "user-1", completedExerciseIds: [], solvedPuzzleIds: ["7"] }], {
      itemVersions: new Map(),
    });

    expect(attempts).toEqual([]);
    expect(problems).toEqual(['item "int.arrays.map.write-01" (mapped from "puzzle:3") is missing from the Item table']);
  });

  it("reports a completion whose legacy exercise or puzzle row was deleted", () => {
    const { problems } = plan([{ userId: "user-1", completedExerciseIds: ["deleted-exercise"], solvedPuzzleIds: ["99"] }]);

    expect(problems).toEqual([
      "exercise deleted-exercise of user user-1 no longer exists, so it has no map key",
      "puzzle 99 of user user-1 no longer exists, so it has no map key",
    ]);
  });
});
