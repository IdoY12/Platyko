import { describe, expect, it } from "vitest";
import type { Item } from "@project/content-model";
import { generateTrace } from "../trace/generateTrace.js";
import { probedValue } from "./itemChecks.js";

const traceItem = (code: string[], afterLine: number, variable: string, visit = 1): { item: Item; code: string[] } => ({
  code,
  item: {
    id: "beg.u.c.trace-01",
    concept: "c",
    prerequisites: [],
    format: "TRACE",
    difficulty: 1,
    prompt: "p",
    code,
    solution: { probe: { variable, afterLine, visit }, expectedOutput: "" },
    explanation: "e",
    hints: ["a", "b", "c"],
    reference: { title: "t", url: "https://developer.mozilla.org/en-US/", source: "MDN" },
    duelEligible: false,
    author: "test",
    version: 1,
    track: "BEGINNER",
    unit: "u",
  },
});

function valueOf({ item, code }: ReturnType<typeof traceItem>): string | null {
  const traced = generateTrace(code);
  if (!traced.ok) throw new Error(traced.reason);
  return probedValue(item, traced.trace);
}

describe("probedValue", () => {
  it("reads a value right after a simple line", () => {
    expect(valueOf(traceItem(["let tray = 12;", "tray = tray / 4;", "tray = tray + 5;", "console.log(tray);"], 2, "tray"))).toBe("3");
  });

  it("counts loop iterations as visits", () => {
    const code = ["let total = 0;", "for (let n = 1; n <= 3; n++) {", "  total = total + n;", "}", "console.log(total);"];
    expect(valueOf(traceItem(code, 3, "total", 1))).toBe("1");
    expect(valueOf(traceItem(code, 3, "total", 2))).toBe("3");
    expect(valueOf(traceItem(code, 3, "total", 3))).toBe("6");
  });

  it("does not count a call returning to the probed line as a second visit", () => {
    const code = ["function double(x) {", "  return x * 2;", "}", "let price = double(4);", "price = price + 1;", "console.log(price);"];
    expect(valueOf(traceItem(code, 4, "price", 1))).toBe("8");
    expect(valueOf(traceItem(code, 4, "price", 2))).toBeNull();
  });

  it("counts a line that follows a call made on the line before it", () => {
    const code = ["const add = (x) => x + 2;", "let level = 0;", "for (let i = 0; i < 3; i++) {", "  let next = add(level);", "  level = next;", "}", "console.log(level);"];
    expect(valueOf(traceItem(code, 5, "level", 1))).toBe("2");
    expect(valueOf(traceItem(code, 5, "level", 2))).toBe("4");
  });
});
