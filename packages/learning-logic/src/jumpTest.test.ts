import { describe, expect, it } from "vitest";
import { answerCurrentItem, advanceLesson, EMPTY_PROGRESS, isJumpTestPassed, jumpTestId, jumpTestItemIds, jumpTestTrack, startLessonSession, withJumpedTrack, type MapUnit } from "./index.js";

const unit = (name: string, order: number, track: MapUnit["track"]): MapUnit => ({
  unit: name,
  track,
  order,
  title: name,
  summary: "",
  lessons: [
    ...[1, 2, 3, 4].map((lesson) => ({ id: `${name}.lesson-${lesson}`, title: "", concept: `${name}-c${lesson}`, itemIds: [`${name}.${lesson}.a`, `${name}.${lesson}.b`] })),
    { id: `${name}.summary`, title: null, concept: null, itemIds: [] },
  ],
});
const map = [unit("one", 1, "BEGINNER"), unit("two", 2, "BEGINNER"), unit("three", 3, "BEGINNER"), unit("later", 1, "INTERMEDIATE")];

describe("jump test", () => {
  it("names the track it opens and never the first track", () => {
    expect(jumpTestTrack(jumpTestId("ADVANCED"))).toBe("ADVANCED");
    expect(jumpTestTrack(jumpTestId("BEGINNER"))).toBeNull();
    expect(jumpTestTrack("one.lesson-1")).toBeNull();
  });

  it("draws ten first items of the previous track, unit by unit in turns", () => {
    const ids = jumpTestItemIds(map, "INTERMEDIATE");
    expect(ids).toHaveLength(10);
    expect(ids.slice(0, 4)).toEqual(["one.1.a", "two.1.a", "three.1.a", "one.2.a"]);
    expect(ids.every((id) => id.endsWith(".a") && !id.startsWith("later"))).toBe(true);
    expect(jumpTestItemIds(map, "ADVANCED")).toEqual(["later.1.a", "later.2.a", "later.3.a", "later.4.a"]);
  });

  it("passes at eight of ten, and scales the bar for a shorter test", () => {
    expect(isJumpTestPassed(8, 10)).toBe(true);
    expect(isJumpTestPassed(7, 10)).toBe(false);
    expect(isJumpTestPassed(4, 4)).toBe(true);
    expect(isJumpTestPassed(3, 4)).toBe(false);
    expect(isJumpTestPassed(0, 0)).toBe(false);
  });

  it("opens the track and every track before it", () => {
    expect(withJumpedTrack(EMPTY_PROGRESS, "ADVANCED").jumpedTracks).toEqual(["INTERMEDIATE", "ADVANCED"]);
  });

  it("gives one attempt per item and never brings a wrong item back", () => {
    const session = startLessonSession(jumpTestId("INTERMEDIATE"), [{ kind: "item", itemId: "x", review: false }], { test: true });
    const answered = answerCurrentItem(session, false);
    expect(answered.outcome).toBe("reveal");
    expect(advanceLesson(answered.session).slots).toHaveLength(1);
  });
});
