import { readFileSync } from "node:fs";
import { z } from "zod";
import type { Item } from "@project/content-model";
import { curriculumPosition } from "../bank/curriculum.js";
import type { CurriculumUnit } from "../bank/curriculum.js";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { parseProgram } from "../bank/parseProgram.js";
import { constructsPath } from "../bank/paths.js";
import { WRONG_SOLUTION_LABEL, executableProgramsOf } from "../bank/programs.js";
import { detectConstructs } from "./detectConstructs.js";

/** Construct id -> slug of the unit that teaches it (`content/constructs.json`). */
export type ConstructsMap = Record<string, string>;

/** Null when the file is missing or is not an object of strings. */
export function loadConstructsMap(contentRoot: string): ConstructsMap | null {
  try {
    const raw: unknown = JSON.parse(readFileSync(constructsPath(contentRoot), "utf8"));
    return z.record(z.string(), z.string()).parse(raw);
  } catch {
    return null;
  }
}

/** Constructs used by the programs a learner reads or has to produce, with where each first appears. */
function constructsOf(item: Item): Map<string, string> {
  const places = new Map<string, string>();
  for (const { label, lines } of executableProgramsOf(item)) {
    const parsed = parseProgram(lines);
    if (label.startsWith(WRONG_SOLUTION_LABEL) || parsed.ast === null) continue;
    for (const [construct, line] of detectConstructs(parsed.ast)) {
      if (!places.has(construct)) places.set(construct, `"${label}" program, line ${line}`);
    }
  }
  return places;
}

/**
 * Mechanical part of Gate D (PRD 8.3): a snippet may use only constructs taught in the item's own
 * unit or in an earlier one. Purely positional; prerequisites do not waive anything.
 */
export function scanConstructs(item: Item, constructsMap: ConstructsMap, curriculum: CurriculumUnit[]): Finding[] {
  const findings: Finding[] = [];
  const report = reporterFor(findings, "D", item.unit, item.id);
  const itemPosition = curriculumPosition(curriculum, item.unit);
  if (itemPosition === -1) return findings;
  for (const [construct, place] of constructsOf(item)) {
    const home = constructsMap[construct];
    const homePosition = home === undefined ? -1 : curriculumPosition(curriculum, home);
    if (homePosition === -1) {
      report("construct-unmapped", `constructs.json does not map "${construct}" to a curriculum unit (${place})`);
    } else if (homePosition > itemPosition) {
      report("construct-above-level", `uses "${construct}", which is taught later, in "${home}" (${place})`);
    }
  }
  return findings;
}
