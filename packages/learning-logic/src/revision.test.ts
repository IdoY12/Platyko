import { describe, expect, it } from "vitest";
import { revisionChoice, revisionId } from "./index.js";

describe("revision", () => {
  it("carries a revision choice in its id and rejects other lengths", () => {
    expect(revisionChoice(revisionId(["loops", "arrays"], 20))).toEqual({ units: ["loops", "arrays"], length: 20 });
    expect(revisionChoice("revision:15:loops")).toBeNull();
    expect(revisionChoice("revision:10:")).toBeNull();
    expect(revisionChoice("loops.lesson-1")).toBeNull();
  });
});
