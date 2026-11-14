import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { computeBankHash } from "../bank/bankHash.js";
import type { FindingGate } from "../bank/finding.js";
import { CONTENT_ROOT } from "../bank/paths.js";
import { readJsonFile, writeJsonFile } from "./jsonFile.js";

/** A refusal that is an ordinary answer, not a crash: a void pass, an unknown run, a second finish. */
export class PassRefusal extends Error {}

/** The exit condition (PRD 8.5): the final run is the third consecutive clean full pass. */
const CLEAN_PASSES_TO_RELEASE = 3;

const GATES = ["PRECHECK", "A", "B", "C", "D"] as const satisfies readonly FindingGate[];
const gateSchema = z.enum(GATES);
const gateResultSchema = z.enum(["PASS", "FAIL"]);

export const findingSchema = z.strictObject({
  gate: gateSchema,
  check: z.string(),
  itemId: z.string().nullable(),
  unit: z.string(),
  message: z.string(),
});

export const originalitySchema = z.strictObject({ result: gateResultSchema, maxSimilarity: z.number(), checkedAt: z.string() });

const runLogSchema = z.strictObject({
  runId: z.string(),
  /** ISO UTC. */
  startedAt: z.string(),
  endedAt: z.string(),
  /** 1-based count of all logs in `runs/`, this one included. */
  passNumber: z.number().int(),
  /** Clean passes in a row over the same bank hash, this one included; 0 when this pass has findings. */
  consecutiveCleanPasses: z.number().int(),
  /** Zero findings in every gate. */
  clean: z.boolean(),
  /** The pass ran with the complete-bank requirement. */
  completeBank: z.boolean(),
  bankHash: z.string(),
  itemCount: z.number().int(),
  agents: z.record(gateSchema, z.strictObject({ agent: z.string(), model: z.string() })),
  itemResults: z.record(z.string(), z.record(gateSchema, gateResultSchema)),
  originality: z.record(z.string(), originalitySchema),
  /** `resolution` says how the finding was fixed; it is filled in after the pass. */
  findings: z.array(findingSchema.extend({ resolution: z.string().nullable() })),
});

/** The log of one full pass (PRD 8.6), stored as `content/verification/runs/<runId>.json`. */
export type RunLog = z.infer<typeof runLogSchema>;

function runsDirectory(contentRoot: string): string {
  return join(contentRoot, "verification", "runs");
}

export function runLogPath(contentRoot: string, runId: string): string {
  return join(runsDirectory(contentRoot), `${runId}.json`);
}

/** Every stored log, oldest first by the time its pass ended. Throws when a file is not a run log. */
function readRunLogs(contentRoot: string): RunLog[] {
  const directory = runsDirectory(contentRoot);
  const fileNames = existsSync(directory) ? readdirSync(directory).filter((fileName) => fileName.endsWith(".json")) : [];
  return fileNames
    .map((fileName) => {
      const parsed = runLogSchema.safeParse(readJsonFile(join(directory, fileName)));
      if (!parsed.success) throw new Error(`content/verification/runs/${fileName} is not a run log: ${parsed.error.message}`);
      return parsed.data;
    })
    .sort((left, right) => (`${left.endedAt} ${left.runId}` < `${right.endedAt} ${right.runId}` ? -1 : 1));
}

function storedRunLog(contentRoot: string, runId: string): RunLog {
  const log = readRunLogs(contentRoot).find((candidate) => candidate.runId === runId);
  if (!log) throw new PassRefusal(`There is no run log for ${runId}.`);
  return log;
}

/**
 * Stores the log of a finished pass and returns it with its bookkeeping. A clean pass continues
 * the count of the pass before it only when that pass was clean over the same bank hash: any
 * finding, and any edit to any item, starts the count again (PRD 8.4, 8.6).
 */
export function recordRun(contentRoot: string, run: Omit<RunLog, "passNumber" | "consecutiveCleanPasses" | "clean">): RunLog {
  const earlierLogs = readRunLogs(contentRoot);
  if (earlierLogs.some((log) => log.runId === run.runId)) throw new PassRefusal(`Pass ${run.runId} is already finished and logged.`);
  const previous = earlierLogs.at(-1);
  const clean = run.findings.length === 0;
  const continuesCount = previous !== undefined && previous.clean && previous.bankHash === run.bankHash;
  const log: RunLog = {
    ...run,
    passNumber: earlierLogs.length + 1,
    consecutiveCleanPasses: clean ? (continuesCount ? previous.consecutiveCleanPasses : 0) + 1 : 0,
    clean,
  };
  writeJsonFile(runLogPath(contentRoot, run.runId), runLogSchema.parse(log));
  return log;
}

/**
 * Records how findings of a past run were fixed (PRD 8.6): `resolutions` maps the index of a
 * finding in that log to a sentence. Nothing else in the log changes.
 */
export function resolveFindings(request: { contentRoot: string; runId: string; resolutions: Record<string, string> }): RunLog {
  const log = storedRunLog(request.contentRoot, request.runId);
  for (const [index, resolution] of Object.entries(request.resolutions)) {
    const finding = log.findings[Number(index)];
    if (!finding) throw new PassRefusal(`Run ${request.runId} has no finding number ${index}.`);
    finding.resolution = resolution;
  }
  writeJsonFile(runLogPath(request.contentRoot, request.runId), log);
  return log;
}

/**
 * Whether the bank under `contentRoot` may be released (PRD 8.5): the latest pass is clean, ran
 * over the complete bank, is at least the third consecutive clean pass, and logged the hash the
 * content has now.
 */
export function releaseStatus(contentRoot: string = CONTENT_ROOT): { releasable: boolean; reason: string; runId: string | null; consecutiveCleanPasses: number } {
  const latest = readRunLogs(contentRoot).at(-1);
  if (!latest) return { releasable: false, reason: "no verification pass has been logged", runId: null, consecutiveCleanPasses: 0 };
  const { runId, consecutiveCleanPasses } = latest;
  let refusal: string | null = null;
  if (!latest.clean) refusal = `the latest pass has ${latest.findings.length} finding(s)`;
  else if (!latest.completeBank) refusal = "the latest pass ran without the complete-bank requirement";
  else if (latest.bankHash !== computeBankHash(contentRoot)) refusal = "the bank has changed since the latest pass";
  else if (consecutiveCleanPasses < CLEAN_PASSES_TO_RELEASE) refusal = `${consecutiveCleanPasses} consecutive clean pass(es) so far; ${CLEAN_PASSES_TO_RELEASE} are required`;
  const reason = refusal ?? `the latest pass is consecutive clean full pass number ${consecutiveCleanPasses} over the current bank`;
  return { releasable: refusal === null, reason, runId, consecutiveCleanPasses };
}
