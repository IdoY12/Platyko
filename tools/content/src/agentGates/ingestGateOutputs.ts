import { join } from "node:path";
import { z } from "zod";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { allItems } from "../bank/loadBank.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { tracesDirectory } from "../bank/paths.js";
import type { JudgeCodeWrite } from "../gateA/itemChecks.js";
import type { UnitTraces } from "../gateA/runGateA.js";
import { readJsonFile } from "../runLog/jsonFile.js";
import { gateCheck, readGateOutput } from "./gateFiles.js";
import { ingestClarityReview, ingestFitReview } from "./reviewOutput.js";
import { compareSolverOutput } from "./solverOutput.js";

type GateOutputsRequest = {
  passDirectory: string;
  contentRoot: string;
  units: LoadedUnit[];
  /** Runs the solver's own `CODE_WRITE` answers in the production sandbox. */
  judgeCodeWrite: JudgeCodeWrite;
};

/** Each solution is validated against its item's format later, so one malformed entry does not void the rest. */
const solverOutputSchema = z.object({ unit: z.string(), solutions: z.array(z.looseObject({ id: z.string() })) });

/** Gate B: every item of the unit solved blind, each solution compared with the stated answer and the stored trace. */
async function ingestSolverOutput(request: GateOutputsRequest, loaded: LoadedUnit, unit: string, findings: Finding[]): Promise<void> {
  const output = readGateOutput(request.passDirectory, "B", unit, solverOutputSchema, findings);
  const traces = readJsonFile(join(tracesDirectory(request.contentRoot), `${unit}.json`)) as UnitTraces | undefined;
  for (const item of allItems([loaded])) {
    const report = reporterFor(findings, "B", unit, item.id);
    const solution = output?.solutions.find((candidate) => candidate.id === item.id);
    if (solution) await compareSolverOutput(item, solution, traces?.items[item.id], request.judgeCodeWrite, report);
    else report(gateCheck("B", "not-solved"), "the solver's output has no entry for it");
  }
}

/**
 * Reads what the agents of gates B, C and D wrote into the pass folder and turns it into findings,
 * gate by gate. Bad agent output never throws: it is a finding like any other.
 */
export async function ingestGateOutputs(request: GateOutputsRequest): Promise<Finding[]> {
  const findings: Finding[] = [];
  const units = request.units.flatMap((loaded) => (loaded.unit ? [{ loaded, unit: loaded.unit }] : []));
  for (const { loaded, unit } of units) await ingestSolverOutput(request, loaded, unit.unit, findings);
  const reviewedUnits = units.map(({ loaded, unit }) => ({
    unit: unit.unit,
    itemIds: allItems([loaded]).map((item) => item.id),
    lessonIds: unit.lessons.map((lesson) => lesson.id),
  }));
  for (const reviewedUnit of reviewedUnits) ingestClarityReview(request.passDirectory, reviewedUnit, findings);
  for (const reviewedUnit of reviewedUnits) ingestFitReview(request.passDirectory, reviewedUnit, findings);
  return findings;
}
