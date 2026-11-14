import { describe, expect, it, vi } from "vitest";
import { EMPTY_PROGRESS, type AttemptRecord, type MapUnit } from "@project/learning-logic";

const lessons = (unit: string) => [1, 2, 3, 4].map((lesson) => ({ id: `${unit}.lesson-${lesson}`, title: "", concept: `${unit}.c${lesson}`, itemIds: [`${unit}.${lesson}`] }));
const units: MapUnit[] = ["a", "b", "c"].map((unit, index) => ({ unit, track: "BEGINNER", order: index + 1, title: unit, summary: "", lessons: lessons(unit) }));
vi.mock("../content/contentCatalog.js", () => ({ loadContentMap: () => Promise.resolve({ bankHash: "test", units }) }));

const { withPassedJumpTests } = await import("./jumpTestPass.js");

const testItems = ["a.1", "b.1", "c.1", "a.2", "b.2", "c.2", "a.3", "b.3", "c.3", "a.4"];
const attempt = (itemId: string, correct = true, context: AttemptRecord["context"] = "JUMP_TEST"): AttemptRecord => ({
  clientAttemptId: itemId, itemId, itemVersion: 1, correct, attemptNo: 1, optionIndex: null, usedHint: 0, context, lessonId: null, answeredAt: "2026-11-14T10:00:00.000Z",
});
const transaction = (storedRight: string[]) => ({ itemAttempt: { findMany: vi.fn(() => Promise.resolve(storedRight.map((itemId) => ({ itemId })))) } }) as never;

describe("withPassedJumpTests", () => {
  it("opens the track when stored and new answers reach eight of ten", async () => {
    const batch = testItems.slice(5, 8).map((itemId) => attempt(itemId));
    const opened = await withPassedJumpTests(transaction(testItems.slice(0, 5)), "user", EMPTY_PROGRESS, batch);
    expect(opened.jumpedTracks).toEqual(["INTERMEDIATE"]);
  });

  it("keeps the track closed at seven, and ignores answers from lessons", async () => {
    const batch = [attempt("c.3", true, "LESSON"), attempt("a.4", false)];
    const closed = await withPassedJumpTests(transaction(testItems.slice(0, 7)), "user", EMPTY_PROGRESS, batch);
    expect(closed.jumpedTracks).toEqual([]);
  });

  it("does nothing for a batch without jump-test answers", async () => {
    const tx = transaction(testItems);
    expect(await withPassedJumpTests(tx, "user", EMPTY_PROGRESS, [attempt("a.1", true, "LESSON")])).toBe(EMPTY_PROGRESS);
  });
});
