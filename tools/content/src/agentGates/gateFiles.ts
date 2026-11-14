import { join, relative } from "node:path";
import type { z } from "zod";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { readJsonFile } from "../runLog/jsonFile.js";

/** The gates worked by agents (PRD 8.3): B blind solver, C clarity reviewer, D difficulty and fit reviewer. */
export type AgentGate = "B" | "C" | "D";

function gateFilePath(passDirectory: string, gate: AgentGate, unit: string, kind: "input" | "output"): string {
  return join(passDirectory, `gate-${gate.toLowerCase()}`, `${unit}.${kind}.json`);
}

/** What the pipeline hands to the agent of one gate for one unit. */
export function gateInputPath(passDirectory: string, gate: AgentGate, unit: string): string {
  return gateFilePath(passDirectory, gate, unit, "input");
}

/** What the agent writes back, beside its input. */
export function gateOutputPath(passDirectory: string, gate: AgentGate, unit: string): string {
  return gateFilePath(passDirectory, gate, unit, "output");
}

/** Name of a finding about the agent's output itself, for example `gate-c-not-reviewed`. */
export function gateCheck(gate: AgentGate, problem: string): string {
  return `gate-${gate.toLowerCase()}-${problem}`;
}

export function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "(file)"}: ${issue.message}`).join("; ");
}

/** One gate output, validated. A missing, unparsable or misshapen file is a finding, and null is returned. */
export function readGateOutput<Output extends { unit: string }>(
  passDirectory: string,
  gate: AgentGate,
  unit: string,
  schema: z.ZodType<Output>,
  findings: Finding[],
): Output | null {
  const report = reporterFor(findings, gate, unit);
  const filePath = gateOutputPath(passDirectory, gate, unit);
  const fileName = relative(passDirectory, filePath);
  let raw: unknown;
  try {
    raw = readJsonFile(filePath);
  } catch (error) {
    report(gateCheck(gate, "output-invalid"), `${fileName} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  if (raw === undefined) {
    report(gateCheck(gate, "output-missing"), `the agent did not write ${fileName}`);
    return null;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    report(gateCheck(gate, "output-invalid"), `${fileName} does not have the required shape: ${describeIssues(parsed.error)}`);
    return null;
  }
  if (parsed.data.unit !== unit) {
    report(gateCheck(gate, "output-invalid"), `${fileName} says it is about the unit "${parsed.data.unit}"`);
    return null;
  }
  return parsed.data;
}
