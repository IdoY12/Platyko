import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FetchFunction } from "../bank/network.js";
import { allItems, loadBank } from "../bank/loadBank.js";
import { computeBankHash } from "../bank/bankHash.js";
import { gateOutputPath } from "../agentGates/gateFiles.js";
import { ProgramRunnerPool } from "../execute/programRunnerPool.js";
import { FIXTURE_CURRICULUM, FIXTURE_ITEMS_PER_UNIT } from "../fixtures/fixtureUnit.js";
import { copyFixtureContentRoot, judgeWithRunner, passingGateOutputs } from "../fixtures/passFixtures.js";
import type { GateAContext } from "../gateA/itemChecks.js";
import type { UnitTraces } from "../gateA/runGateA.js";
import { readJsonFile } from "./jsonFile.js";
import { finishPass, passDirectory, startPass } from "./pass.js";
import { PassRefusal, recordRun, releaseStatus, resolveFindings, runLogPath } from "./runLog.js";
import type { RunLog } from "./runLog.js";

const agent = { agent: "fresh-agent", model: "a-model" };
const AGENTS: RunLog["agents"] = { PRECHECK: agent, A: agent, B: agent, C: agent, D: agent };
const SOURCE_HTML = readFileSync(new URL("../originality/fixtures/made-up-source.html", import.meta.url), "utf8");
const fetchFunction: FetchFunction = async () => new Response(SOURCE_HTML, { status: 200 });

function syntheticRun(contentRoot: string, number: number, change: Partial<RunLog> = {}): RunLog {
  const runId = `run-2026010${number}-000000`;
  const base = { runId, startedAt: `2026-01-0${number}T00:00:00.000Z`, endedAt: `2026-01-0${number}T00:10:00.000Z`, completeBank: true, bankHash: "hash-1", itemCount: 1, agents: AGENTS, itemResults: {}, originality: {}, findings: [] };
  return recordRun(contentRoot, { ...base, ...change });
}

const finding = { gate: "B" as const, check: "solver-answer-mismatch", itemId: "item-1", unit: "unit-1", message: "m", resolution: null };

describe("run log", () => {
  it("counts consecutive clean passes, restarting on a finding and on any change of the bank hash", () => {
    const contentRoot = copyFixtureContentRoot();
    const counts = [
      syntheticRun(contentRoot, 1),
      syntheticRun(contentRoot, 2),
      syntheticRun(contentRoot, 3, { bankHash: "hash-2" }),
      syntheticRun(contentRoot, 4, { findings: [finding] }),
      syntheticRun(contentRoot, 5, { bankHash: "hash-2" }),
      syntheticRun(contentRoot, 6, { bankHash: "hash-2" }),
    ].map((log) => [log.passNumber, log.consecutiveCleanPasses, log.clean]);
    expect(counts).toEqual([[1, 1, true], [2, 2, true], [3, 1, true], [4, 0, false], [5, 1, true], [6, 2, true]]);
  });

  it("refuses to log the same pass twice", () => {
    const contentRoot = copyFixtureContentRoot();
    syntheticRun(contentRoot, 1);
    expect(() => syntheticRun(contentRoot, 1)).toThrow(PassRefusal);
  });

  it("changes only the resolutions of a logged run", () => {
    const contentRoot = copyFixtureContentRoot();
    const log = syntheticRun(contentRoot, 1, { findings: [finding, { ...finding, check: "other" }] });
    const resolved = resolveFindings({ contentRoot, runId: log.runId, resolutions: { "1": "reworded the prompt" } });
    expect(resolved).toEqual({ ...log, findings: [finding, { ...finding, check: "other", resolution: "reworded the prompt" }] });
    expect(readJsonFile(runLogPath(contentRoot, log.runId))).toEqual(resolved);
    expect(() => resolveFindings({ contentRoot, runId: log.runId, resolutions: { "5": "x" } })).toThrow(PassRefusal);
    expect(() => resolveFindings({ contentRoot, runId: "run-unknown", resolutions: {} })).toThrow(PassRefusal);
  });
});

describe("release status", () => {
  const status = (contentRoot: string) => releaseStatus(contentRoot);

  it("is releasable only after a third consecutive clean pass of the complete bank over the current content", () => {
    const contentRoot = copyFixtureContentRoot();
    const bankHash = computeBankHash(contentRoot);
    expect(status(contentRoot)).toMatchObject({ releasable: false, runId: null, consecutiveCleanPasses: 0 });
    syntheticRun(contentRoot, 1, { bankHash });
    syntheticRun(contentRoot, 2, { bankHash });
    expect(status(contentRoot)).toMatchObject({ releasable: false, consecutiveCleanPasses: 2 });
    syntheticRun(contentRoot, 3, { bankHash });
    expect(status(contentRoot)).toMatchObject({ releasable: true, runId: "run-20260103-000000", consecutiveCleanPasses: 3 });
    const unitPath = loadBank(contentRoot).units[0].filePath;
    writeFileSync(unitPath, readFileSync(unitPath, "utf8").replace("Fixture", "Changed"));
    expect(status(contentRoot)).toMatchObject({ releasable: false, reason: "the bank has changed since the latest pass" });
    syntheticRun(contentRoot, 4, { bankHash, findings: [finding] });
    expect(status(contentRoot)).toMatchObject({ releasable: false, consecutiveCleanPasses: 0 });
  });

  it("is not releasable when the latest passes did not require the complete bank", () => {
    const contentRoot = copyFixtureContentRoot();
    const bankHash = computeBankHash(contentRoot);
    for (const number of [1, 2, 3]) syntheticRun(contentRoot, number, { bankHash, completeBank: false });
    expect(status(contentRoot)).toMatchObject({ releasable: false, reason: "the latest pass ran without the complete-bank requirement", consecutiveCleanPasses: 3 });
  });
});

describe("pass lifecycle", () => {
  let pool: ProgramRunnerPool;
  let execution: GateAContext;
  beforeAll(() => {
    pool = new ProgramRunnerPool(2);
    execution = { runPrograms: (jobs) => pool.runMany(jobs), judgeCodeWrite: judgeWithRunner };
  });
  afterAll(() => pool.close());

  const start = (contentRoot: string, second: number) =>
    startPass({ contentRoot, complete: false, execution, curriculum: FIXTURE_CURRICULUM, itemsPerUnit: FIXTURE_ITEMS_PER_UNIT, fetchFunction, now: () => new Date(Date.UTC(2026, 0, 2, 3, 4, second)) });

  function writeAgentOutputs(contentRoot: string, runId: string, change: (outputs: ReturnType<typeof passingGateOutputs>) => void = () => undefined): void {
    const { units } = loadBank(contentRoot);
    const traces = readJsonFile(join(contentRoot, "generated", "traces", "fixture-unit.json")) as UnitTraces;
    const outputs = passingGateOutputs(units[0].unit!, traces, allItems(units));
    change(outputs);
    for (const gate of ["B", "C", "D"] as const) {
      const filePath = gateOutputPath(passDirectory(contentRoot, runId), gate, "fixture-unit");
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(outputs[gate]));
    }
  }

  const finish = (contentRoot: string, runId: string) => finishPass({ contentRoot, runId, agents: { B: agent, C: agent, D: agent }, judgeCodeWrite: judgeWithRunner, now: () => new Date(Date.UTC(2026, 0, 2, 4)) });

  it("starts a pass, takes the gate outputs and logs a clean pass", async () => {
    const contentRoot = copyFixtureContentRoot();
    const pass = await start(contentRoot, 5);
    expect(pass).toMatchObject({ runId: "run-20260102-030405", itemCount: 8, findings: [], units: ["fixture-unit"] });
    expect(readJsonFile(join(passDirectory(contentRoot, pass.runId), "pass.json"))).toEqual(pass);
    expect(Object.keys(pass.originality)).toHaveLength(8);
    writeAgentOutputs(contentRoot, pass.runId);
    const log = await finish(contentRoot, pass.runId);
    expect(log).toMatchObject({ passNumber: 1, consecutiveCleanPasses: 1, clean: true, completeBank: false, bankHash: pass.bankHash, endedAt: "2026-01-02T04:00:00.000Z" });
    expect(log.agents.A.agent).toBe("tools/content");
    expect(Object.values(log.itemResults).every((results) => Object.values(results).every((result) => result === "PASS"))).toBe(true);
  });

  it("fails the item a gate finding names and keeps unit-level findings out of the item results", async () => {
    const contentRoot = copyFixtureContentRoot();
    const pass = await start(contentRoot, 6);
    writeAgentOutputs(contentRoot, pass.runId, (outputs) => {
      outputs.C.reviews[0].findings.push({ category: "bad-hint", detail: "x" } as never);
      outputs.C.conceptCards[0].findings.push({ category: "other", detail: "y" } as never);
    });
    const log = await finish(contentRoot, pass.runId);
    expect(log).toMatchObject({ clean: false, consecutiveCleanPasses: 0 });
    expect(log.findings.map((entry) => entry.check)).toEqual(["bad-hint", "other"]);
    const failing = Object.entries(log.itemResults).filter(([, results]) => results.C === "FAIL").map(([itemId]) => itemId);
    expect(failing).toEqual([log.findings[0].itemId]);
  });

  it("voids a pass whose bank changed, and refuses an unknown pass", async () => {
    const contentRoot = copyFixtureContentRoot();
    const pass = await start(contentRoot, 7);
    writeAgentOutputs(contentRoot, pass.runId);
    const unitPath = loadBank(contentRoot).units[0].filePath;
    writeFileSync(unitPath, readFileSync(unitPath, "utf8").replace("Fixture", "Changed"));
    await expect(finish(contentRoot, pass.runId)).rejects.toThrow(/pass is void/);
    await expect(finish(contentRoot, "run-nothing")).rejects.toThrow(PassRefusal);
  });
});
