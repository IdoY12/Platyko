import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Track } from "@project/content-model";
import { exportGateInputs } from "../agentGates/exportGateInputs.js";
import type { AgentGate } from "../agentGates/gateFiles.js";
import { ingestGateOutputs } from "../agentGates/ingestGateOutputs.js";
import { computeBankHash } from "../bank/bankHash.js";
import { CURRICULUM } from "../bank/curriculum.js";
import type { CurriculumUnit } from "../bank/curriculum.js";
import type { Finding, FindingGate } from "../bank/finding.js";
import { allItems, loadBank } from "../bank/loadBank.js";
import type { FetchFunction } from "../bank/network.js";
import type { GateAContext, JudgeCodeWrite } from "../gateA/itemChecks.js";
import { runGateA, writeTraces } from "../gateA/runGateA.js";
import { runPrecheck } from "../precheck/runPrecheck.js";
import { readJsonFile, writeJsonFile } from "./jsonFile.js";
import { PassRefusal, findingSchema, originalitySchema, recordRun } from "./runLog.js";
import type { RunLog } from "./runLog.js";

type AgentIdentity = RunLog["agents"][FindingGate];

/** What a started pass leaves in its working folder for `finishPass`: the mechanical half of the pass. */
const passStateSchema = z.strictObject({
  runId: z.string(),
  startedAt: z.string(),
  completeBank: z.boolean(),
  /** Computed after the traces of this pass were written. */
  bankHash: z.string(),
  itemCount: z.number().int(),
  units: z.array(z.string()),
  /** Pre-check, Gate D construct scan and Gate A. */
  findings: z.array(findingSchema),
  originality: z.record(z.string(), originalitySchema),
});
type PassState = z.infer<typeof passStateSchema>;

/** The pipeline itself works the pre-check and Gate A. */
const PIPELINE_IDENTITY: AgentIdentity = {
  agent: "tools/content",
  model: z.object({ version: z.string() }).parse(readJsonFile(fileURLToPath(new URL("../../package.json", import.meta.url)))).version,
};

/** The uncommitted working folder of one pass: `pass.json` and the gate input and output files. */
export function passDirectory(contentRoot: string, runId: string): string {
  return join(contentRoot, "verification", "work", runId);
}

function passStatePath(contentRoot: string, runId: string): string {
  return join(passDirectory(contentRoot, runId), "pass.json");
}

/** `run-<UTC yyyymmdd-hhmmss>`. */
function runIdAt(isoTime: string): string {
  return `run-${isoTime.slice(0, 10).replaceAll("-", "")}-${isoTime.slice(11, 19).replaceAll(":", "")}`;
}

type StartPassRequest = {
  contentRoot: string;
  /** Also require all 28 units and the duel pool size. */
  complete: boolean;
  /** The program runner and the sandbox judge of Gate A. */
  execution: GateAContext;
  /** Defaults: the real curriculum, unit sizes, network and clock. */
  curriculum?: CurriculumUnit[];
  itemsPerUnit?: Record<Track, number>;
  fetchFunction?: FetchFunction;
  now?: () => Date;
};

/**
 * Starts a full pass (PRD 8.4): runs the pre-check and Gate A over the whole bank, stores the
 * traces, and writes the working folder with `pass.json` and the input files of gates B, C and D.
 */
export async function startPass(request: StartPassRequest): Promise<PassState> {
  const { contentRoot, complete, curriculum = CURRICULUM, now = () => new Date() } = request;
  const startedAt = now().toISOString();
  const runId = runIdAt(startedAt);
  if (existsSync(passDirectory(contentRoot, runId))) throw new PassRefusal(`Pass ${runId} was started this very second; start again.`);

  const precheck = await runPrecheck({ contentRoot, requireCompleteBank: complete, curriculum, itemsPerUnit: request.itemsPerUnit, fetchFunction: request.fetchFunction });
  const { units } = loadBank(contentRoot);
  const gateA = await runGateA(units, request.execution);
  writeTraces(contentRoot, gateA.traces);

  const pass: PassState = {
    runId,
    startedAt,
    completeBank: complete,
    bankHash: computeBankHash(contentRoot),
    itemCount: precheck.itemCount,
    units: gateA.traces.map((unitTraces) => unitTraces.unit),
    findings: [...precheck.findings, ...precheck.constructFindings, ...gateA.findings],
    originality: Object.fromEntries(Object.entries(precheck.originality).map(([itemId, record]) => [itemId, { ...record, checkedAt: startedAt }])),
  };
  writeJsonFile(passStatePath(contentRoot, runId), pass);
  exportGateInputs({ passDirectory: passDirectory(contentRoot, runId), runId, contentRoot, units, traces: gateA.traces, constructFindings: precheck.constructFindings, curriculum });
  return pass;
}

type FinishPassRequest = {
  contentRoot: string;
  runId: string;
  /** Who worked gates B, C and D in this pass. */
  agents: Record<AgentGate, AgentIdentity>;
  judgeCodeWrite: JudgeCodeWrite;
  now?: () => Date;
};

function startedPass(contentRoot: string, runId: string): PassState {
  const parsed = passStateSchema.safeParse(readJsonFile(passStatePath(contentRoot, runId)));
  if (!parsed.success) throw new PassRefusal(`There is no started pass ${runId}: content/verification/work/${runId}/pass.json is missing or damaged.`);
  return parsed.data;
}

/** An item fails a gate when a finding of that gate names it. */
function itemResultsOf(itemIds: string[], findings: Finding[]): RunLog["itemResults"] {
  const failures = new Set(findings.map((finding) => `${finding.gate} ${finding.itemId}`));
  const resultOf = (gate: FindingGate, itemId: string) => (failures.has(`${gate} ${itemId}`) ? "FAIL" : "PASS");
  return Object.fromEntries(
    itemIds.map((itemId) => [
      itemId,
      { PRECHECK: resultOf("PRECHECK", itemId), A: resultOf("A", itemId), B: resultOf("B", itemId), C: resultOf("C", itemId), D: resultOf("D", itemId) },
    ]),
  );
}

/**
 * Finishes a pass: ingests what the agents of gates B, C and D wrote and stores the run log.
 * Refuses when the bank is no longer the one the pass started on.
 */
export async function finishPass(request: FinishPassRequest): Promise<RunLog> {
  const { contentRoot, runId, now = () => new Date() } = request;
  const pass = startedPass(contentRoot, runId);
  if (computeBankHash(contentRoot) !== pass.bankHash) {
    throw new PassRefusal(`The bank changed after pass ${runId} started, so the pass is void. Start a new pass.`);
  }
  const { units } = loadBank(contentRoot);
  const agentFindings = await ingestGateOutputs({ passDirectory: passDirectory(contentRoot, runId), contentRoot, units, judgeCodeWrite: request.judgeCodeWrite });
  const findings = [...pass.findings, ...agentFindings];
  return recordRun(contentRoot, {
    runId,
    startedAt: pass.startedAt,
    endedAt: now().toISOString(),
    completeBank: pass.completeBank,
    bankHash: pass.bankHash,
    itemCount: pass.itemCount,
    agents: { PRECHECK: PIPELINE_IDENTITY, A: PIPELINE_IDENTITY, ...request.agents },
    itemResults: itemResultsOf(allItems(units).map((item) => item.id), findings),
    originality: pass.originality,
    findings: findings.map((finding) => ({ ...finding, resolution: null })),
  });
}
