import { CODE_MAX_LINE_LENGTH } from "@project/content-model";
import type { FindingReporter } from "../bank/finding.js";

/** Authoring limits on one displayed line (README "Item rules"): length, tabs, trailing spaces, indentation. */
export function checkCodeLine(report: FindingReporter, where: string, line: string): void {
  if (line.includes("\n")) report("code-line-break", `${where} contains a line break; every line is its own entry`);
  if (line.length > CODE_MAX_LINE_LENGTH) {
    report("code-line-too-long", `${where} has ${line.length} characters; the limit is ${CODE_MAX_LINE_LENGTH}`);
  }
  if (line.includes("\t")) report("code-tab", `${where} contains a tab`);
  if (line !== line.trimEnd()) report("code-trailing-whitespace", `${where} ends with whitespace`);
  const indentation = line.length - line.replace(/^ +/, "").length;
  if (indentation % 2 !== 0) {
    report("code-indentation", `${where} is indented by ${indentation} spaces; indentation is a multiple of two`);
  }
}

/** The line limits applied to a whole snippet, plus its maximum number of lines. */
export function checkCodeLimits(report: FindingReporter, label: string, lines: string[], maxLines: number): void {
  if (lines.length > maxLines) {
    report("code-too-many-lines", `${label} has ${lines.length} lines; the limit is ${maxLines}`);
  }
  lines.forEach((line, index) => checkCodeLine(report, `${label} line ${index + 1}`, line));
}
