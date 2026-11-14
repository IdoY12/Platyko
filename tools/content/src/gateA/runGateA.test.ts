import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthoredItem, UnitFile } from "@project/content-model";
import { ProgramRunnerPool } from "../execute/programRunnerPool.js";
import { loadFixtureUnit } from "../fixtures/fixtureUnit.js";
import { judgeWithRunner } from "../fixtures/passFixtures.js";
import type { GateAContext } from "./itemChecks.js";
import { runGateA, staleTraceFindings, writeTraces } from "./runGateA.js";

let pool: ProgramRunnerPool;
let context: GateAContext;
beforeAll(() => {
  pool = new ProgramRunnerPool(2);
  context = { runPrograms: (jobs) => pool.runMany(jobs), judgeCodeWrite: judgeWithRunner };
});
afterAll(() => pool.close());

const gateA = async (unit: UnitFile) => runGateA([{ filePath: "fixture.json", raw: unit, unit }], context);
const checksOf = async (unit: UnitFile) => (await gateA(unit)).findings.map((finding) => finding.check).sort();

function changeItem(format: AuthoredItem["format"], change: (item: AuthoredItem) => void, variant?: "ORDER_OUTPUT"): UnitFile {
  const unit = loadFixtureUnit();
  const item = unit.items.find((candidate) => candidate.format === format && candidate.variant === variant);
  if (!item) throw new Error(`The fixture has no ${format} item.`);
  change(item);
  return unit;
}

describe("Gate A", () => {
  it("passes the fixture unit and generates a trace for every item and concept card", async () => {
    const unit = loadFixtureUnit();
    const { findings, traces } = await gateA(unit);
    expect(findings).toEqual([]);
    expect(Object.keys(traces[0].items).sort()).toEqual(unit.items.map((item) => item.id).sort());
    expect(Object.keys(traces[0].conceptCards).sort()).toEqual(unit.lessons.map((lesson) => lesson.id).sort());
  });

  it("fails an item whose actual output differs from the stated answer", async () => {
    expect(await checksOf(changeItem("PREDICT_OUTPUT", (item) => (item.solution.expectedOutput = "10")))).toEqual(["output-mismatch"]);
  });

  it("fails a distractor that equals the real output, and a correct option that does not", async () => {
    const unit = changeItem("PREDICT_OUTPUT", (item) => {
      item.options![0].correct = false;
      item.options![1].correct = true;
    });
    expect(await checksOf(unit)).toEqual(["correct-option-not-output", "distractor-equals-output"]);
  });

  it("checks the traced value of a TRACE item against its options", async () => {
    const unit = changeItem("TRACE", (item) => (item.solution.probe!.visit = 3));
    expect(await checksOf(unit)).toEqual(["correct-option-not-traced-value", "distractor-equals-traced-value"]);
    expect(await checksOf(changeItem("TRACE", (item) => (item.solution.probe!.visit = 9)))).toEqual(["probe-not-reached"]);
  });

  it("executes every Parsons ordering and reports one that works but is not recorded", async () => {
    expect(await checksOf(changeItem("PARSONS", (item) => (item.solution.acceptedOrders = [])))).toEqual(["unrecorded-order"]);
    expect(await checksOf(changeItem("PARSONS", (item) => item.solution.acceptedOrders!.push([0, 1, 2, 3, 4])))).toEqual(["accepted-order-wrong"]);
  });

  it("fails an ORDER_OUTPUT item whose stated output is not the real one", async () => {
    const unit = changeItem("PARSONS", (item) => (item.solution.expectedOutput = "start\ntask done\ninside task"), "ORDER_OUTPUT");
    expect(await checksOf(unit)).toEqual(["output-mismatch"]);
  });

  it("runs every chip placement of a FILL_BLANK item", async () => {
    expect(await checksOf(changeItem("FILL_BLANK", (item) => item.solution.blanks![1].push("0")))).toEqual(["accepted-fill-wrong"]);
    expect(await checksOf(changeItem("FILL_BLANK", (item) => (item.solution.expectedOutput = "undefined")))).toContain("distractor-fill-passes");
  });

  it("requires the bug to be real, the fix to work and the distractor fixes to fail", async () => {
    const unit = changeItem("FIX_BUG", (item) => {
      item.options![0].correct = false;
      item.options![2].correct = true;
    });
    expect(await checksOf(unit)).toEqual(["distractor-fix-passes", "fix-does-not-work"]);
    expect(await checksOf(changeItem("FIX_BUG", (item) => (item.solution.expectedOutput = "30")))).toContain("buggy-code-passes");
  });

  it("requires the reference to pass and every wrong solution to fail in the sandbox", async () => {
    const unit = changeItem("CODE_WRITE", (item) => (item.solution.wrongSolutions![0] = item.solution.reference!));
    expect(await checksOf(unit)).toEqual(["wrong-solution-passes"]);
    expect(await checksOf(changeItem("CODE_WRITE", (item) => (item.solution.reference = ["return 0;"])))).toEqual(["reference-fails"]);
  });

  it("checks the worked example of a concept card", async () => {
    const unit = loadFixtureUnit();
    unit.lessons[0].conceptCard.expectedOutput = "something else";
    expect(await checksOf(unit)).toEqual(["concept-card-output-mismatch"]);
  });

  it("stores traces and detects a stored file that execution no longer reproduces", async () => {
    const contentRoot = mkdtempSync(join(tmpdir(), "gate-a-"));
    const { traces } = await gateA(loadFixtureUnit());
    expect(staleTraceFindings(contentRoot, traces).map((finding) => finding.check)).toEqual(["trace-file-stale"]);
    writeTraces(contentRoot, traces);
    expect(staleTraceFindings(contentRoot, traces)).toEqual([]);
    const stored = JSON.parse(readFileSync(join(contentRoot, "generated", "traces", "fixture-unit.json"), "utf8")) as { unit: string };
    expect(stored.unit).toBe("fixture-unit");
    const changed = await gateA(changeItem("PREDICT_OUTPUT", (item) => (item.code![0] = "let total = 1;")));
    expect(staleTraceFindings(contentRoot, changed.traces).map((finding) => finding.check)).toEqual(["trace-file-stale"]);
  });
});
