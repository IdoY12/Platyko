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
 */
import { parseArgs } from "node:util";
import { judgeCodeWrite } from "@project/code-sandbox";
import type { Finding } from "./bank/finding.js";
import { loadBank, unitSlugOf } from "./bank/loadBank.js";
import { CONTENT_ROOT, defaultCacheDirectory } from "./bank/paths.js";
import { ProgramRunnerPool } from "./execute/programRunnerPool.js";
import { runGateA, staleTraceFindings, writeTraces } from "./gateA/runGateA.js";
import { fetchSources, updateLedgerHashes } from "./originality/sourceCache.js";
import { runPrecheck } from "./precheck/runPrecheck.js";

function printFindings(title: string, findings: Finding[]): void {
  console.log(`\n${title}: ${findings.length === 0 ? "clean" : `${findings.length} finding(s)`}`);
  for (const finding of findings) {
    console.log(`  [${finding.gate}] ${finding.unit}${finding.itemId ? ` ${finding.itemId}` : ""} — ${finding.check}: ${finding.message}`);
  }
}

async function verify(flags: { unit?: string; offline: boolean; precheckOnly: boolean; writeTraces: boolean; complete: boolean }): Promise<number> {
  const precheck = await runPrecheck({ unit: flags.unit, offline: flags.offline, requireCompleteBank: flags.complete });
  printFindings(`Pre-check (${precheck.itemCount} items in ${precheck.unitCount} units${precheck.linksSkipped ? ", reference links skipped" : ""})`, precheck.findings);
  printFindings("Gate D construct scan", precheck.constructFindings);
  if (flags.precheckOnly) return precheck.findings.length === 0 ? 0 : 1;

  const units = loadBank().units.filter((loaded) => flags.unit === undefined || unitSlugOf(loaded) === flags.unit);
  const pool = new ProgramRunnerPool();
  try {
    const gateA = await runGateA(units, { runPrograms: (jobs) => pool.runMany(jobs), judgeCodeWrite });
    if (flags.writeTraces) writeTraces(CONTENT_ROOT, gateA.traces);
    const findings = [...gateA.findings, ...(flags.writeTraces ? [] : staleTraceFindings(CONTENT_ROOT, gateA.traces))];
    printFindings("Gate A", findings);
    return precheck.findings.length + findings.length === 0 ? 0 : 1;
  } finally {
    await pool.close();
  }
}

async function sources(updateLedger: boolean): Promise<number> {
  const { units } = loadBank();
  const cacheDir = defaultCacheDirectory(CONTENT_ROOT);
  const findings = updateLedger ? await updateLedgerHashes(units, { cacheDir }) : (await fetchSources(units, { cacheDir, refresh: true })).findings;
  printFindings(updateLedger ? "Ledger update" : "Source download", findings);
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
    },
  });
  const [command] = positionals;
  if (command === "verify") {
    return verify({ unit: values.unit, offline: values.offline, precheckOnly: values["precheck-only"], writeTraces: values["write-traces"], complete: values.complete });
  }
  if (command === "sources") return sources(values["update-ledger"]);
  console.error("Usage: cli <verify|sources> [options] — see the header of tools/content/src/cli.ts");
  return 2;
}

process.exitCode = await main();
