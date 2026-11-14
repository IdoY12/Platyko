import { ITEMS_PER_UNIT } from "@project/content-model";
import type { Track } from "@project/content-model";
import { CURRICULUM } from "../bank/curriculum.js";
import type { CurriculumUnit } from "../bank/curriculum.js";
import { WHOLE_BANK, reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { unitSlugOf } from "../bank/loadBank.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { unitFileSchema } from "../schema/unitFileSchema.js";
import { checkItem } from "./itemRules.js";
import { checkUnit } from "./unitRules.js";

const MINIMUM_DUEL_ELIGIBLE_ITEMS = 200;

export type StructureOptions = {
  /** Also require every curriculum unit and the duel pool size. Off while the bank is being authored. */
  requireCompleteBank?: boolean;
  /** Limit the per-unit and per-item rules to one unit slug. Bank-wide rules always run. */
  unit?: string;
  curriculum?: CurriculumUnit[];
  itemsPerUnit?: Record<Track, number>;
};

/** Id of the item a schema issue sits in, when the issue path leads into `items[n]`. */
function itemIdAt(raw: unknown, path: PropertyKey[]): string | null {
  if (path[0] !== "items" || typeof path[1] !== "number") return null;
  const item = (raw as { items?: unknown[] }).items?.[path[1]];
  const id = (item as { id?: unknown } | undefined)?.id;
  return typeof id === "string" ? id : null;
}

function checkFileShape(loaded: LoadedUnit, findings: Finding[]): void {
  const unit = unitSlugOf(loaded);
  if (loaded.jsonError !== undefined) {
    reporterFor(findings, "PRECHECK", unit)("unit-file-not-json", `the file is not valid JSON: ${loaded.jsonError}`);
    return;
  }
  const parsed = unitFileSchema.safeParse(loaded.raw);
  for (const issue of parsed.error?.issues ?? []) {
    const report = reporterFor(findings, "PRECHECK", unit, itemIdAt(loaded.raw, issue.path));
    report("schema", `${issue.path.join(".") || "(file)"}: ${issue.message}`);
  }
}

/** One finding on every occurrence of a value that appears more than once across the bank. */
function reportRepeats(
  findings: Finding[],
  check: string,
  what: string,
  occurrences: { value: string; unit: string; itemId: string | null }[],
): void {
  const unitsByValue = new Map<string, string[]>();
  for (const { value, unit } of occurrences) unitsByValue.set(value, [...(unitsByValue.get(value) ?? []), unit]);
  for (const { value, unit, itemId } of occurrences) {
    const units = unitsByValue.get(value) ?? [];
    if (units.length > 1) {
      reporterFor(findings, "PRECHECK", unit, itemId)(check, `${what} "${value}" appears ${units.length} times (units: ${units.join(", ")})`);
    }
  }
}

function checkWholeBank(units: LoadedUnit[], options: StructureOptions, curriculum: CurriculumUnit[], findings: Finding[]): void {
  const validUnits = units.flatMap(({ unit }) => (unit ? [unit] : []));
  const itemIds = validUnits.flatMap((unit) => unit.items.map((item) => ({ value: item.id, unit: unit.unit, itemId: item.id })));
  const conceptIds = validUnits.flatMap((unit) =>
    unit.concepts.map((concept) => ({ value: concept.id, unit: unit.unit, itemId: null })),
  );
  const unitSlugs = validUnits.map((unit) => ({ value: unit.unit, unit: unit.unit, itemId: null }));
  reportRepeats(findings, "item-id-duplicate", "item id", itemIds);
  reportRepeats(findings, "concept-duplicate", "concept id", conceptIds);
  reportRepeats(findings, "unit-duplicate", "unit slug", unitSlugs);
  if (!options.requireCompleteBank) return;
  const presentUnits = new Set(units.map(unitSlugOf));
  for (const entry of curriculum) {
    if (!presentUnits.has(entry.unit)) {
      reporterFor(findings, "PRECHECK", entry.unit)("unit-missing", `the ${entry.track} unit "${entry.unit}" (${entry.title}) has no file`);
    }
  }
  const duelEligibleCount = validUnits.flatMap((unit) => unit.items).filter((item) => item.duelEligible && !item.retired).length;
  if (duelEligibleCount < MINIMUM_DUEL_ELIGIBLE_ITEMS) {
    const report = reporterFor(findings, "PRECHECK", WHOLE_BANK);
    report("duel-eligible-total", `the bank has ${duelEligibleCount} duel-eligible items; at least ${MINIMUM_DUEL_ELIGIBLE_ITEMS} are required`);
  }
}

/**
 * Schema and structural pre-check (PRD 8.2) over units in bank order, as `loadBank` returns them.
 * One finding per violation; an empty array is a pass.
 */
export function checkStructure(units: LoadedUnit[], options: StructureOptions = {}): Finding[] {
  const { curriculum = CURRICULUM, itemsPerUnit = ITEMS_PER_UNIT } = options;
  const findings: Finding[] = [];
  const availableConcepts = new Set<string>();
  for (const loaded of units) {
    const selected = options.unit === undefined || options.unit === unitSlugOf(loaded);
    const { unit } = loaded;
    if (!unit) {
      if (selected) checkFileShape(loaded, findings);
      continue;
    }
    for (const concept of unit.concepts) availableConcepts.add(concept.id);
    if (!selected) continue;
    checkUnit(loaded, unit, availableConcepts, { curriculum, itemsPerUnit }, reporterFor(findings, "PRECHECK", unit.unit));
    for (const item of unit.items) {
      checkItem(item, { unit, availableConcepts }, reporterFor(findings, "PRECHECK", unit.unit, item.id));
    }
  }
  checkWholeBank(units, options, curriculum, findings);
  return findings;
}
