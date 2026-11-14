import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { normaliseOutput } from "@project/content-model";
import type { Item, ItemTrace } from "@project/content-model";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { allItems } from "../bank/loadBank.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { tracesDirectory } from "../bank/paths.js";
import { solvedProgramOf, wrapCodeWrite } from "../bank/programs.js";
import { generateTrace } from "../trace/generateTrace.js";
import { checkItemByExecution } from "./itemChecks.js";
import type { GateAContext } from "./itemChecks.js";

/** The generated file for one unit: a trace per item and per lesson concept card. */
export type UnitTraces = { unit: string; items: Record<string, ItemTrace>; conceptCards: Record<string, ItemTrace> };

export type GateAResult = { findings: Finding[]; traces: UnitTraces[] };

/** The program the execution player shows for an item: the snippet as it reads once solved. */
function tracedProgramOf(item: Item): string[] | null {
  const { entry, reference, tests } = item.solution;
  if (item.format === "CODE_WRITE") return entry && reference ? wrapCodeWrite(entry, reference, tests?.[0]?.input) : null;
  return solvedProgramOf(item);
}

/**
 * Gate A (PRD 8.3): executes every snippet of the given units. The actual result decides: stated
 * answers must be what the code produces, distractors must not be, and every trace is generated
 * here from that execution. Returns the findings and the traces to store.
 */
export async function runGateA(units: LoadedUnit[], context: GateAContext): Promise<GateAResult> {
  const findings: Finding[] = [];
  const traces: UnitTraces[] = [];

  for (const loaded of units) {
    const unit = loaded.unit;
    if (!unit) continue;
    const unitTraces: UnitTraces = { unit: unit.unit, items: {}, conceptCards: {} };
    traces.push(unitTraces);

    for (const lesson of unit.lessons) {
      const report = reporterFor(findings, "A", unit.unit);
      const card = lesson.conceptCard;
      const traced = generateTrace(card.code);
      if (!traced.ok) {
        report("concept-card-trace-failed", `${lesson.id}: ${traced.reason}`);
      } else {
        unitTraces.conceptCards[lesson.id] = traced.trace;
        const actual = normaliseOutput(traced.trace.output.join("\n"));
        if (actual !== normaliseOutput(card.expectedOutput)) report("concept-card-output-mismatch", `${lesson.id}: the worked example prints ${JSON.stringify(actual)}, not the stated output`);
      }
    }

    for (const item of allItems([loaded])) {
      const report = reporterFor(findings, "A", unit.unit, item.id);
      const program = tracedProgramOf(item);
      const traced = program ? generateTrace(program, { dom: item.dom }) : null;
      if (!traced) report("trace-failed", "the item has no program to execute");
      else if (!traced.ok) report("trace-failed", traced.reason);
      else unitTraces.items[item.id] = traced.trace;
      await checkItemByExecution(item, traced?.ok ? traced.trace : null, context, report);
    }
  }
  return { findings, traces };
}

function traceFilePath(contentRoot: string, unit: string): string {
  return join(tracesDirectory(contentRoot), `${unit}.json`);
}

const serialise = (traces: UnitTraces): string => `${JSON.stringify(traces, null, 1)}\n`;

/** Stores the generated traces under `content/generated/traces`, one file per unit. */
export function writeTraces(contentRoot: string, traces: UnitTraces[]): void {
  mkdirSync(tracesDirectory(contentRoot), { recursive: true });
  for (const unitTraces of traces) writeFileSync(traceFilePath(contentRoot, unitTraces.unit), serialise(unitTraces));
}

/** A finding for every unit whose committed trace file is not what execution generates now. */
export function staleTraceFindings(contentRoot: string, traces: UnitTraces[]): Finding[] {
  const findings: Finding[] = [];
  for (const unitTraces of traces) {
    const path = traceFilePath(contentRoot, unitTraces.unit);
    const stored = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (stored !== serialise(unitTraces)) {
      reporterFor(findings, "A", unitTraces.unit)("trace-file-stale", "content/generated/traces is not what execution produces; run the verify command with --write-traces");
    }
  }
  return findings;
}
