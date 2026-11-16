import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Item } from "@project/content-model";
import type { Finding } from "../bank/finding.js";
import { allItems, loadBank } from "../bank/loadBank.js";
import { ProgramRunnerPool } from "../execute/programRunnerPool.js";
import { FIXTURE_CONTENT_ROOT, FIXTURE_CURRICULUM } from "../fixtures/fixtureUnit.js";
import { judgeWithRunner, passingGateOutputs } from "../fixtures/passFixtures.js";
import { runGateA } from "../gateA/runGateA.js";
import type { UnitTraces } from "../gateA/runGateA.js";
import { writeTraces } from "../gateA/runGateA.js";
import { exportGateInputs } from "./exportGateInputs.js";
import { gateInputPath, gateOutputPath } from "./gateFiles.js";
import type { AgentGate } from "./gateFiles.js";
import { ingestGateOutputs } from "./ingestGateOutputs.js";

const UNIT = "fixture-unit";
const { units } = loadBank(FIXTURE_CONTENT_ROOT);
const items = allItems(units);
const unit = units[0].unit!;
const itemNamed = (slug: string): Item => {
  const found = items.find((item) => item.id.endsWith(slug));
  if (!found) throw new Error(`The fixture has no item ${slug}.`);
  return found;
};

let pool: ProgramRunnerPool;
let traces: UnitTraces;
beforeAll(async () => {
  pool = new ProgramRunnerPool(2);
  traces = (await runGateA(units, { runPrograms: (jobs) => pool.runMany(jobs), judgeCodeWrite: judgeWithRunner })).traces[0];
});
afterAll(() => pool.close());

function exportInputs(runId: string): string {
  const passDirectory = mkdtempSync(join(tmpdir(), "gate-inputs-"));
  exportGateInputs({ passDirectory, runId, contentRoot: FIXTURE_CONTENT_ROOT, units, traces: [traces], constructFindings: [], curriculum: FIXTURE_CURRICULUM });
  return passDirectory;
}

type InputItem = { id: string; variant?: string; options: string[]; code: string[]; probe: unknown; shuffledOutput: string[]; observedOutput: string };
type GateInput = { outputRules: unknown; items: InputItem[]; lessons: unknown[]; earlierUnits: string[]; concepts: { id: string }[] };

const readInput = (passDirectory: string, gate: AgentGate) => JSON.parse(readFileSync(gateInputPath(passDirectory, gate, UNIT), "utf8")) as GateInput;

function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)]);
}

describe("gate input export", () => {
  const FORBIDDEN_KEYS = ["solution", "expectedOutput", "expected", "explanation", "hints", "correct", "feedback", "difficulty", "concept", "prerequisites", "misconceptions", "conceptCard", "lessons", "reference", "wrongSolutions", "bugLine", "lineOrder", "acceptedOrders", "blanks", "steps", "observedOutput", "trace", "legacyKeys", "author", "duelEligible"];

  it("shows the blind solver nothing that states or hints at an answer", () => {
    const text = readFileSync(gateInputPath(exportInputs("run-1"), "B", UNIT), "utf8");
    expect(keysOf(JSON.parse(text)).filter((key) => FORBIDDEN_KEYS.includes(key))).toEqual([]);
    for (const item of items) {
      expect(text).not.toContain(item.explanation);
      for (const hint of item.hints) expect(text).not.toContain(hint);
    }
    for (const option of items.flatMap((item) => item.options ?? []).filter((candidate) => candidate.feedback)) expect(text).not.toContain(option.feedback);
  });

  it("gives the solver what a learner sees: code, shuffled options, probe, entry and test inputs", () => {
    const input = readInput(exportInputs("run-1"), "B");
    expect(input.outputRules).toEqual({ file: "content/README.md", section: "Execution model" });
    const byId = (slug: string) => input.items.find((entry) => entry.id.endsWith(slug))!;
    expect(byId("trace-01").probe).toEqual(itemNamed("trace-01").solution.probe);
    expect(byId("predict-01").options.sort()).toEqual(["14", "4", "9"]);
    expect(byId("fix-01").code).toEqual(itemNamed("fix-01").code);
    expect(byId("write-01")).toMatchObject({ entry: itemNamed("write-01").solution.entry, testInputs: [[[3, 9, 4]], [[-5, -2, -8]], [[7]], [[1, 2, 6]]] });
    const orderOutput = input.items.find((entry) => entry.variant === "ORDER_OUTPUT")!;
    expect(orderOutput.shuffledOutput.sort()).toEqual(["inside task", "start", "task done"]);
  });

  it("shuffles the same way for the same run and differently for another run", () => {
    const first = readFileSync(gateInputPath(exportInputs("run-1"), "B", UNIT), "utf8");
    expect(readFileSync(gateInputPath(exportInputs("run-1"), "B", UNIT), "utf8")).toBe(first);
    expect(readFileSync(gateInputPath(exportInputs("run-2"), "B", UNIT), "utf8")).not.toBe(first);
  });

  it("gives the clarity reviewer the whole unit and what each snippet really printed, and no solver output", () => {
    const passDirectory = exportInputs("run-1");
    const input = readInput(passDirectory, "C");
    const predict = input.items.find((entry) => entry.id.endsWith("predict-01"));
    expect(predict).toMatchObject({ observedOutput: "9", explanation: itemNamed("predict-01").explanation });
    expect(input.lessons).toHaveLength(4);
    expect(Object.keys(input)).toEqual(expect.arrayContaining(["concepts", "misconceptions"]));
    expect(readdirSync(dirname(gateInputPath(passDirectory, "C", UNIT)))).toEqual([`${UNIT}.input.json`]);
  });

  it("gives the fit reviewer the curriculum position, the concepts and the construct findings of the unit", () => {
    const passDirectory = mkdtempSync(join(tmpdir(), "gate-inputs-"));
    const constructFinding: Finding = { gate: "D", check: "construct-too-early", itemId: null, unit: UNIT, message: "m" };
    const other: Finding = { ...constructFinding, unit: "variables" };
    exportGateInputs({ passDirectory, runId: "run-1", contentRoot: FIXTURE_CONTENT_ROOT, units, traces: [traces], constructFindings: [constructFinding, other], curriculum: FIXTURE_CURRICULUM });
    const input = readInput(passDirectory, "D");
    expect(input.earlierUnits).toHaveLength(8);
    expect(input).toMatchObject({ track: "BEGINNER", lessonRecipes: { file: "content/README.md", section: "Lesson recipes" }, constructFindings: [constructFinding] });
    expect(input.concepts.map((concept) => concept.id)).toEqual(unit.concepts.map((concept) => concept.id));
    // What each lesson teaches, so a reviewer can tell a taught idea from an undeclared one.
    expect(input.lessons[0]).toMatchObject({ conceptCard: { title: unit.lessons[0].conceptCard.title, body: unit.lessons[0].conceptCard.body } });
  });
});

type Outputs = ReturnType<typeof passingGateOutputs>;

async function ingest(change: (outputs: Outputs) => void = () => undefined, rawFiles: Partial<Record<AgentGate, string>> = {}): Promise<Finding[]> {
  const passDirectory = mkdtempSync(join(tmpdir(), "gate-outputs-"));
  const outputs = passingGateOutputs(unit, traces, items);
  change(outputs);
  for (const gate of ["B", "C", "D"] as const) {
    const filePath = gateOutputPath(passDirectory, gate, UNIT);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, rawFiles[gate] ?? JSON.stringify(outputs[gate]));
  }
  const contentRoot = mkdtempSync(join(tmpdir(), "gate-root-"));
  writeTraces(contentRoot, [traces]);
  return ingestGateOutputs({ passDirectory, contentRoot, units, judgeCodeWrite: judgeWithRunner });
}

const checksOf = (findings: Finding[]): string[] => findings.map((finding) => `${finding.gate}:${finding.check}`).sort();
const solutionOf = (outputs: Outputs, slug: string) => outputs.B.solutions.find((entry) => (entry.id as string).endsWith(slug))!;

describe("gate B ingest", () => {
  it("accepts a correct solver, including another accepted Parsons order", async () => {
    expect(await ingest()).toEqual([]);
    expect(await ingest((outputs) => (solutionOf(outputs, "array-index-and-length.parsons-01").answer = { lines: [itemNamed("array-index-and-length.parsons-01").code![4], ...[2, 1, 3, 0].map((index) => itemNamed("array-index-and-length.parsons-01").code![index])] }))).toEqual([]);
  });

  it.each([
    ["an option that is not the correct one", "predict-01", { optionText: "14" }, "B:solver-answer-mismatch"],
    ["an option that does not exist", "predict-01", { optionText: "nine" }, "B:solver-answer-mismatch"],
    ["a program order that is not accepted", "array-index-and-length.parsons-01", { lines: [] }, "B:solver-answer-mismatch"],
    ["a line that was not given", "array-index-and-length.parsons-01", { lines: ["x"] }, "B:solver-answer-mismatch"],
    ["output lines in the wrong order", "function-return-value.parsons-01", { lines: ["start", "task done", "inside task"] }, "B:solver-answer-mismatch"],
    ["blanks filled wrongly", "fill-01", { blanks: ["size", "1"] }, "B:solver-answer-mismatch"],
    ["the bug on another line", "fix-01", { bugLine: 2, fixText: "cart.sum = cart.sum + extra;" }, "B:solver-answer-mismatch"],
    ["a wrong fix", "fix-01", { bugLine: 3, fixText: "cart.sum = extra;" }, "B:solver-answer-mismatch"],
    ["code that fails the tests", "write-01", { code: ["return 0;"] }, "B:solver-code-fails-tests"],
    ["an answer of the wrong shape", "predict-01", { blanks: [] }, "B:gate-b-output-invalid"],
  ])("reports %s", async (_name, slug, answer, expected) => {
    const checks = checksOf(await ingest((outputs) => (solutionOf(outputs, slug).answer = answer)));
    expect(checks).toContain(expected);
  });

  it("reports a wrong derived output, wrong output lines and wrong final globals, each precisely", async () => {
    const outputChecks = checksOf(await ingest((outputs) => (solutionOf(outputs, "predict-01").printedOutput = ["10"])));
    expect(outputChecks).toEqual(["B:solver-output-mismatch"]);
    const globals = await ingest((outputs) => (solutionOf(outputs, "predict-01").finalGlobals = { total: "10" }));
    expect(globals.map((finding) => finding.check)).toEqual(["solver-globals-mismatch"]);
    expect(globals[0].message).toContain("total: the solver has 10, the execution ends with 9");
    // Quotes around a value are a writing slip, not a different value.
    expect(await ingest((outputs) => (solutionOf(outputs, "predict-01").finalGlobals = { total: "'9'" }))).toEqual([]);
    // Quotes around an object key are notation too: {'sum': 1} is the object {sum: 1}.
    const cart = traces.items[itemNamed("fix-01").id].steps.at(-1)!.variables.find((variable) => variable.name === "cart")!.value;
    const quotedKeys = cart.replace(/(\w+):/g, "'$1':");
    expect(quotedKeys).not.toEqual(cart);
    expect(await ingest((outputs) => (solutionOf(outputs, "fix-01").finalGlobals = { cart: quotedKeys }))).toEqual([]);
    // A binding the solver leaves out is not compared: it may skip one it cannot be sure of.
    expect(await ingest((outputs) => (solutionOf(outputs, "predict-01").finalGlobals = {}))).toEqual([]);
  });

  it("reports an item the solver skipped, and a file that is missing or is not JSON", async () => {
    const skipped = await ingest((outputs) => (outputs.B.solutions = outputs.B.solutions.slice(1)));
    expect(skipped).toMatchObject([{ gate: "B", check: "gate-b-not-solved", itemId: items[0].id }]);
    expect(checksOf(await ingest(() => undefined, { B: "{not json" }))).toContain("B:gate-b-output-invalid");
    expect(checksOf(await ingest(() => undefined, { B: JSON.stringify({ unit: "other", solutions: [] }) }))).toContain("B:gate-b-output-invalid");
  });
});

describe("gate C and D ingest", () => {
  it("turns every reported defect into a finding named by its category", async () => {
    const findings = await ingest((outputs) => {
      outputs.C.reviews[0].findings.push({ category: "bad-hint", detail: "hint 3 gives the answer away" } as never);
      outputs.C.conceptCards[1].findings.push({ category: "other", detail: "the card is unclear" } as never);
      outputs.D.reviews[2].findings.push({ category: "wrong-unit", detail: "teaches closures" } as never);
    });
    expect(findings).toMatchObject([
      { gate: "C", check: "bad-hint", itemId: items[0].id, message: "hint 3 gives the answer away" },
      { gate: "C", check: "other", itemId: null, message: "fixture-unit.lesson-2: the card is unclear" },
      { gate: "D", check: "wrong-unit", itemId: items[2].id },
    ]);
  });

  it("requires a verdict for every item and every lesson", async () => {
    const findings = await ingest((outputs) => {
      outputs.C.reviews.pop();
      outputs.C.conceptCards.shift();
      outputs.D.reviews.shift();
    });
    expect(checksOf(findings)).toEqual(["C:gate-c-not-reviewed", "C:gate-c-not-reviewed", "D:gate-d-not-reviewed"]);
  });

  it("rejects an unknown category, a category of the other gate and an id outside the unit", async () => {
    const findings = await ingest((outputs) => {
      outputs.C.reviews[0].findings.push({ category: "wrong-unit", detail: "x" } as never);
      outputs.D.reviews[0].findings.push({ category: "bad-hint", detail: "x" } as never);
      outputs.D.reviews.push({ id: "elsewhere", findings: [] });
    });
    expect(checksOf(findings)).toEqual(["C:gate-c-output-invalid", "D:gate-d-output-invalid", "D:gate-d-output-invalid"]);
  });

  it("reports a reviewer output that is missing or not JSON", async () => {
    expect(checksOf(await ingest(() => undefined, { C: "oops", D: "[" }))).toEqual(
      expect.arrayContaining(["C:gate-c-output-invalid", "C:gate-c-not-reviewed", "D:gate-d-output-invalid", "D:gate-d-not-reviewed"]),
    );
  });
});
