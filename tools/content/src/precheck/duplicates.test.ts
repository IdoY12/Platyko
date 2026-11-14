import { describe, expect, it } from "vitest";
import type { Item } from "@project/content-model";
import { allItems, loadBank } from "../bank/loadBank.js";
import { FIXTURE_CONTENT_ROOT } from "../fixtures/fixtureUnit.js";
import { checkDuplicates } from "./duplicates.js";

const fixtureItems = allItems(loadBank(FIXTURE_CONTENT_ROOT).units);
const [predict, trace] = fixtureItems;

/** A predict item with its own id, code and prose, so that only what a test sets is shared. */
function item(id: string, changes: Partial<Item>): Item {
  return { ...predict, id, explanation: `Explanation written only for ${id}.`, ...changes };
}

function summary(items: Item[]): string[] {
  return checkDuplicates(items).map((finding) => `${finding.itemId}: ${finding.check}`);
}

const SUM_LOOP = ["let total = 0;", "for (let n = 2; n < 5; n++) {", "  total = total + n;", "}", "console.log(total);"];

describe("checkDuplicates: code", () => {
  it("passes the fixture", () => {
    expect(checkDuplicates(fixtureItems)).toEqual([]);
  });

  it("reports the same program on both items, whatever the names, spacing and comments", () => {
    const renamed = ["let sum=0; // start", "for (let i = 2; i < 5; i++) {", "    sum = sum + i;", "}", "", "console.log( sum );"];
    const findings = checkDuplicates([item("a", { code: SUM_LOOP }), item("b", { code: renamed }), item("c", { code: ["console.log(1);"] })]);
    expect(findings).toEqual([
      { gate: "PRECHECK", check: "duplicate-code", itemId: "a", unit: "fixture-unit", message: "same code (names aside) as b" },
      { gate: "PRECHECK", check: "duplicate-code", itemId: "b", unit: "fixture-unit", message: "same code (names aside) as a" },
    ]);
  });

  it("treats quote style and number notation as the same literal", () => {
    const left = item("a", { code: ["console.log('ab', 10);"] });
    const right = item("b", { code: ['console.log("ab", 1_0.0);'] });
    expect(summary([left, right])).toEqual(["a: duplicate-code", "b: duplicate-code"]);
  });

  it("reports the same structure with other literal values as a near duplicate", () => {
    const otherValues = SUM_LOOP.map((line) => line.replace("2", "1").replace("5", "8"));
    expect(summary([item("a", { code: SUM_LOOP }), item("b", { code: otherValues })])).toEqual([
      "a: near-duplicate-code",
      "b: near-duplicate-code",
    ]);
  });

  it("does not confuse a string with a number, a property with a variable, or built-ins with names", () => {
    const pairs: [string, string][] = [
      ["console.log(typeof 5);", 'console.log(typeof "5");'],
      ["console.log(list.length);", "console.log(list.size);"],
      ["console.log(Math.max(1, 2));", "console.log(Number.max(1, 2));"],
      ["console.log(1 + 2);", "console.log(1 - 2);"],
      ["const a = 1;\nconst b = a;", "const a = 1;\nconst b = b;"],
    ];
    for (const [left, right] of pairs) {
      expect(summary([item("a", { code: left.split("\n") }), item("b", { code: right.split("\n") })]), left).toEqual([]);
    }
  });

  it("allows one program in two formats of the same concept, and nothing else", () => {
    const pairedTrace = { ...trace, id: "t", code: SUM_LOOP };
    expect(summary([item("a", { code: SUM_LOOP }), pairedTrace])).toEqual([]);
    expect(summary([item("a", { code: SUM_LOOP }), { ...pairedTrace, concept: "another-concept" }])).toEqual(["a: duplicate-code", "t: duplicate-code"]);
    const nearTrace = { ...pairedTrace, code: SUM_LOOP.map((line) => line.replace("5", "8")) };
    expect(summary([item("a", { code: SUM_LOOP }), nearTrace])).toEqual([]);
    expect(summary([item("a", { code: SUM_LOOP }), { ...nearTrace, concept: "another-concept" }])).toEqual([
      "a: near-duplicate-code",
      "t: near-duplicate-code",
    ]);
  });

  it("compares the solved program of each format", () => {
    const [, , fill, parsons, , write, , fix] = fixtureItems;
    const asPredict = (id: string, code: string[]) => item(id, { code, concept: "another-concept" });
    expect(summary([fill, asPredict("p", ['const pets = ["cat", "dog", "owl"];', "const last = pets[pets.length - 1];", "console.log(last);"])])).toHaveLength(2);
    expect(summary([parsons, asPredict("p", ['const team = ["ana", "ben"];', 'const extra = "cy";', "team.push(extra);", "console.log(team.length);", "console.log(team[2]);"])])).toHaveLength(2);
    expect(summary([fix, asPredict("p", ["const cart = { items: 2, sum: 30 };", "const extra = 15;", "cart.sum = cart.sum + extra;", "console.log(cart.sum);"])])).toHaveLength(2);
    expect(summary([write, { ...write, id: "w", prompt: "Write the body.", explanation: "Another explanation." }])).toEqual([`${write.id}: duplicate-code`, "w: duplicate-code"]);
  });
});

describe("checkDuplicates: prose", () => {
  const longPrompt = "Line 3 calls the function twice with the same list. What does the program print after both calls have finished running?";

  it("reports a long prompt that is nearly the same as another one", () => {
    const edited = longPrompt.replace("after both calls", "once both calls");
    const items = [item("a", { code: ["one();"], prompt: longPrompt }), item("b", { code: ["two(2);"], prompt: edited })];
    expect(checkDuplicates(items)).toEqual([
      { gate: "PRECHECK", check: "duplicate-prose", itemId: "a", unit: "fixture-unit", message: "nearly the same prompt as b" },
      { gate: "PRECHECK", check: "duplicate-prose", itemId: "b", unit: "fixture-unit", message: "nearly the same prompt as a" },
    ]);
  });

  it("reports a long prompt contained in a longer one", () => {
    const longer = `${longPrompt} Think about what the first call leaves behind in the list before you answer.`;
    const items = [item("a", { code: ["one();"], prompt: longPrompt }), item("b", { code: ["two(2);"], prompt: longer })];
    expect(summary(items)).toEqual(["a: duplicate-prose", "b: duplicate-prose"]);
  });

  it("does not report short generic prompts or long prompts that differ", () => {
    const generic = [item("a", { code: ["one();"] }), item("b", { code: ["two(2);"] }), item("c", { code: ["three(3, 3);"] })];
    expect(generic.every((entry) => entry.prompt === "What does this code print?")).toBe(true);
    expect(summary(generic)).toEqual([]);
    const twelveWords = "Read the loop on line two and say what this program prints.";
    expect(summary([item("a", { code: ["one();"], prompt: twelveWords }), item("b", { code: ["two(2);"], prompt: twelveWords })])).toEqual([]);
    const different = "The loop below visits every price and keeps the largest one. Which value is printed once the loop is over?";
    expect(summary([item("a", { code: ["one();"], prompt: longPrompt }), item("b", { code: ["two(2);"], prompt: different })])).toEqual([]);
  });

  it("reports an explanation used twice, whatever its case and punctuation", () => {
    const explanation = "The loop adds 2, 3 and 4, so the total is 9.";
    const items = [
      item("a", { code: ["one();"], explanation }),
      item("b", { code: ["two(2);"], explanation: "the loop adds 2, 3 and 4 so the total is 9" }),
      item("c", { code: ["three(3, 3);"] }),
    ];
    expect(summary(items)).toEqual(["a: duplicate-prose", "b: duplicate-prose"]);
  });
});

describe("checkDuplicates: speed", () => {
  it("handles a bank of 604 items in well under ten seconds", () => {
    const bank = Array.from({ length: 604 }, (_, index) =>
      item(`item-${index}`, {
        code: [`let total = ${index};`, `for (let n = 0; n < ${index}; n++) {`, `  total = total ${"+-*%"[index % 4]} n${".x".repeat(index % 7)};`, "}", "console.log(total);"],
        prompt: `Program number ${index} adds up a list of ${index} prices one by one. What does it print when the loop has finished its last pass, step ${index * 7}?`,
      }),
    );
    const startedAt = performance.now();
    checkDuplicates(bank);
    // Ten seconds, as the test's name says: a loaded machine must not turn a speed check red.
    expect(performance.now() - startedAt).toBeLessThan(10_000);
  });
});
