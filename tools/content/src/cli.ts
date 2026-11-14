/**
 * Command line of the question-bank pipeline.
 *
 *   verify [--unit <slug>] [--offline] [--precheck-only] [--write-traces] [--complete]
 *       Pre-check and Gate A (PRD 8.2, 8.3). Exits with 1 when there is any finding.
 *       --write-traces stores the generated traces; without it a stale trace file is a finding.
 *       --complete also requires all 28 units and the duel pool size.
 *   sources [--update-ledger]
 *       Downloads the ledger sources into the uncommitted cache; --update-ledger rewrites the
 *       hashes and retrieval dates recorded in the unit files.
 *   pass start [--complete]
 *       Starts a full pass (PRD 8.4): pre-check and Gate A over the whole bank, traces stored, and
 *       the uncommitted working folder content/verification/work/<runId>/ written with the input
 *       files of gates B, C and D. Prints the run id, the folder and the mechanical finding count.
 *   pass finish <runId> --solver "<agent>/<model>" --clarity "<agent>/<model>" --fit "<agent>/<model>"
 *       Ingests the gate output files the agents wrote into the working folder and stores the run
 *       log content/verification/runs/<runId>.json (PRD 8.6). Refuses when the bank changed since
 *       the pass started. Exits with 1 when the pass is not clean.
 *   pass resolve <runId> <resolutions.json>
 *       Records how findings of that run were fixed: { "<finding index>": "<sentence>" }.
 *   status
 *       Says whether the bank may be released (PRD 8.5). Exits with 1 when it may not.
 *   legacy-map [--complete]
 *       Writes content/migration/legacy-item-map.json from the items' legacyKeys. Exits with 1 when
 *       there is any finding; --complete also requires every triaged legacy key to be claimed.
 */
import { relative } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { judgeCodeWrite } from "@project/code-sandbox";
import type { Finding, FindingGate } from "./bank/finding.js";
import { buildLegacyItemMap, legacyItemMapPath } from "./bank/legacyMap.js";
import { loadBank, unitSlugOf } from "./bank/loadBank.js";
import { CONTENT_ROOT, defaultCacheDirectory } from "./bank/paths.js";
import { ProgramRunnerPool } from "./execute/programRunnerPool.js";
import type { GateAContext } from "./gateA/itemChecks.js";
import { runGateA, staleTraceFindings, writeTraces } from "./gateA/runGateA.js";
import { fetchSources, updateLedgerHashes } from "./originality/sourceCache.js";
import { runPrecheck } from "./precheck/runPrecheck.js";
import { readJsonFile, writeJsonFile } from "./runLog/jsonFile.js";
import { finishPass, passDirectory, startPass } from "./runLog/pass.js";
import { PassRefusal, releaseStatus, resolveFindings, runLogPath } from "./runLog/runLog.js";

function printFindings(title: string, findings: Finding[]): void {
  console.log(`\n${title}: ${findings.length === 0 ? "clean" : `${findings.length} finding(s)`}`);
  for (const finding of findings) {
    console.log(`  [${finding.gate}] ${finding.unit}${finding.itemId ? ` ${finding.itemId}` : ""} — ${finding.check}: ${finding.message}`);
  }
}

/** Gate A's program runner and sandbox judge, for as long as `use` runs. */
async function withExecution<Result>(use: (execution: GateAContext) => Promise<Result>): Promise<Result> {
  const pool = new ProgramRunnerPool();
  try {
    return await use({ runPrograms: (jobs) => pool.runMany(jobs), judgeCodeWrite });
  } finally {
    await pool.close();
  }
}

async function verify(flags: { unit?: string; offline: boolean; precheckOnly: boolean; writeTraces: boolean; complete: boolean }): Promise<number> {
  const precheck = await runPrecheck({ unit: flags.unit, offline: flags.offline, requireCompleteBank: flags.complete });
  printFindings(`Pre-check (${precheck.itemCount} items in ${precheck.unitCount} units${precheck.linksSkipped ? ", reference links skipped" : ""})`, precheck.findings);
  printFindings("Gate D construct scan", precheck.constructFindings);
  if (flags.precheckOnly) return precheck.findings.length === 0 ? 0 : 1;

  const units = loadBank().units.filter((loaded) => flags.unit === undefined || unitSlugOf(loaded) === flags.unit);
  return withExecution(async (execution) => {
    const gateA = await runGateA(units, execution);
    if (flags.writeTraces) writeTraces(CONTENT_ROOT, gateA.traces);
    const findings = [...gateA.findings, ...(flags.writeTraces ? [] : staleTraceFindings(CONTENT_ROOT, gateA.traces))];
    printFindings("Gate A", findings);
    return precheck.findings.length + findings.length === 0 ? 0 : 1;
  });
}

async function sources(updateLedger: boolean): Promise<number> {
  const { units } = loadBank();
  const cacheDir = defaultCacheDirectory(CONTENT_ROOT);
  const findings = updateLedger ? await updateLedgerHashes(units, { cacheDir }) : (await fetchSources(units, { cacheDir, refresh: true })).findings;
  printFindings(updateLedger ? "Ledger update" : "Source download", findings);
  return findings.length === 0 ? 0 : 1;
}

const repositoryPath = (filePath: string): string => `content/${relative(CONTENT_ROOT, filePath)}`;

async function passStart(complete: boolean): Promise<number> {
  const pass = await withExecution((execution) => startPass({ contentRoot: CONTENT_ROOT, complete, execution }));
  console.log(`Pass ${pass.runId} started over ${pass.itemCount} items in ${pass.units.length} units.`);
  console.log(`Working folder: ${repositoryPath(passDirectory(CONTENT_ROOT, pass.runId))}`);
  console.log(`Mechanical findings (pre-check, Gate D construct scan, Gate A): ${pass.findings.length}`);
  return 0;
}

/** `<agent>/<model>`, as given to --solver, --clarity and --fit. */
function agentIdentity(flag: string, value: string | undefined): { agent: string; model: string } {
  const [agent, ...modelParts] = (value ?? "").split("/");
  const model = modelParts.join("/");
  if (agent === "" || model === "") throw new PassRefusal(`--${flag} needs "<agent>/<model>".`);
  return { agent, model };
}

async function passFinish(runId: string, flags: { solver?: string; clarity?: string; fit?: string }): Promise<number> {
  const agents = { B: agentIdentity("solver", flags.solver), C: agentIdentity("clarity", flags.clarity), D: agentIdentity("fit", flags.fit) };
  const log = await finishPass({ contentRoot: CONTENT_ROOT, runId, agents, judgeCodeWrite });
  const gates: FindingGate[] = ["PRECHECK", "A", "B", "C", "D"];
  const countOf = (gate: FindingGate) => log.findings.filter((finding) => finding.gate === gate).length;
  console.log(`Pass ${log.passNumber} (${runId}): ${log.clean ? "clean" : `${log.findings.length} finding(s)`}`);
  console.log(`  findings per gate: ${gates.map((gate) => `${gate} ${countOf(gate)}`).join(", ")}`);
  console.log(`  consecutive clean passes: ${log.consecutiveCleanPasses}`);
  console.log(`  run log: ${repositoryPath(runLogPath(CONTENT_ROOT, runId))}`);
  return log.clean ? 0 : 1;
}

function passResolve(runId: string, resolutionsFile: string): number {
  const resolutions = z.record(z.string(), z.string().trim().min(1)).safeParse(readJsonFile(resolutionsFile));
  if (!resolutions.success) throw new PassRefusal(`${resolutionsFile} must be a JSON object of finding index -> sentence.`);
  const log = resolveFindings({ contentRoot: CONTENT_ROOT, runId, resolutions: resolutions.data });
  const resolvedCount = log.findings.filter((finding) => finding.resolution !== null).length;
  console.log(`Run ${runId}: ${resolvedCount} of ${log.findings.length} finding(s) have a resolution.`);
  return 0;
}

function status(): number {
  const { releasable, reason, runId, consecutiveCleanPasses } = releaseStatus(CONTENT_ROOT);
  console.log(`${releasable ? "Releasable" : "Not releasable"}: ${reason}.`);
  console.log(`  latest run: ${runId ?? "none"}; consecutive clean passes: ${consecutiveCleanPasses}`);
  return releasable ? 0 : 1;
}

function legacyMap(complete: boolean): number {
  const { map, findings } = buildLegacyItemMap(loadBank().units, { contentRoot: CONTENT_ROOT, requireCompleteBank: complete });
  writeJsonFile(legacyItemMapPath(CONTENT_ROOT), map);
  console.log(`Wrote ${Object.keys(map).length} legacy key(s) to ${repositoryPath(legacyItemMapPath(CONTENT_ROOT))}`);
  printFindings("Legacy map", findings);
  return findings.length === 0 ? 0 : 1;
}

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      unit: { type: "string" },
      offline: { type: "boolean", default: false },
      "precheck-only": { type: "boolean", default: false },
      "write-traces": { type: "boolean", default: false },
      complete: { type: "boolean", default: false },
      "update-ledger": { type: "boolean", default: false },
      solver: { type: "string" },
      clarity: { type: "string" },
      fit: { type: "string" },
    },
  });
  const [command, action, runId, resolutionsFile] = positionals;
  if (command === "verify") {
    return verify({ unit: values.unit, offline: values.offline, precheckOnly: values["precheck-only"], writeTraces: values["write-traces"], complete: values.complete });
  }
  if (command === "sources") return sources(values["update-ledger"]);
  if (command === "pass" && action === "start") return passStart(values.complete);
  if (command === "pass" && action === "finish" && runId) return passFinish(runId, values);
  if (command === "pass" && action === "resolve" && runId && resolutionsFile) return passResolve(runId, resolutionsFile);
  if (command === "status") return status();
  if (command === "legacy-map") return legacyMap(values.complete);
  console.error("Usage: cli <verify|sources|pass start|pass finish|pass resolve|status|legacy-map> [options] — see the header of tools/content/src/cli.ts");
  return 2;
}

/** A refusal (a void pass, an unknown run) is an answer to print, not a crash. */
function refusalExitCode(error: unknown): number {
  if (!(error instanceof PassRefusal)) throw error;
  console.error(error.message);
  return 1;
}

process.exitCode = await main().catch(refusalExitCode);
