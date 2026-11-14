import { existsSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { UnitConcept, UnitFile } from "@project/content-model";
import { WHOLE_BANK, reporterFor } from "../bank/finding.js";
import type { Finding, FindingReporter } from "../bank/finding.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { readJsonFile } from "../runLog/jsonFile.js";

/** Unit slug -> the unit's concepts, one per lesson, in lesson order (`content/concept-catalog.json`). */
export type ConceptCatalog = Record<string, UnitConcept[]>;

const conceptSchema = z.strictObject({ id: z.string(), title: z.string(), prerequisites: z.array(z.string()) });
const catalogFileSchema = z.object({ units: z.array(z.object({ unit: z.string(), concepts: z.array(conceptSchema) })) });

function conceptCatalogPath(contentRoot: string): string {
  return join(contentRoot, "concept-catalog.json");
}

/** Null when the file is missing or is not a catalog. */
export function loadConceptCatalog(contentRoot: string): ConceptCatalog | null {
  try {
    const { units } = catalogFileSchema.parse(readJsonFile(conceptCatalogPath(contentRoot)));
    return Object.fromEntries(units.map(({ unit, concepts }) => [unit, concepts]));
  } catch {
    return null;
  }
}

const describeConcept = (concept: UnitConcept | undefined): string => (concept ? JSON.stringify(concept) : "no concept");

/** The unit declares exactly the catalog's concepts: same ids, titles and prerequisites, in the same order. */
function checkAgainstCatalog(unit: UnitFile, catalog: ConceptCatalog, report: FindingReporter): void {
  const fixed = Object.hasOwn(catalog, unit.unit) ? catalog[unit.unit] : null;
  if (fixed === null) {
    report("concept-catalog-mismatch", "the concept catalog has no entry for this unit");
    return;
  }
  for (let index = 0; index < Math.max(fixed.length, unit.concepts.length); index++) {
    if (!isDeepStrictEqual(unit.concepts[index], fixed[index])) {
      report("concept-catalog-mismatch", `concept ${index + 1}: the unit declares ${describeConcept(unit.concepts[index])}; the catalog fixes ${describeConcept(fixed[index])}`);
    }
  }
}

/** Lesson N teaches concept N, so every item of the lesson carries that concept. */
function checkLessonConcepts(unit: UnitFile, findings: Finding[]): void {
  const itemsById = new Map(unit.items.map((item) => [item.id, item]));
  unit.lessons.forEach((lesson, index) => {
    const concept = unit.concepts[index]?.id;
    for (const itemId of lesson.itemIds) {
      const item = itemsById.get(itemId);
      if (item && item.concept !== concept) {
        const taught = concept === undefined ? "has no concept" : `teaches "${concept}"`;
        reporterFor(findings, "PRECHECK", unit.unit, itemId)("lesson-concept-mismatch", `${lesson.id} ${taught}, but the item carries "${item.concept}"`);
      }
    }
  });
}

/**
 * The concepts of every unit are fixed by `content/concept-catalog.json` (README "Lesson recipes").
 * A content root without a catalog (a fixture root) is checked for the lesson rule only.
 */
export function checkConceptCatalog(contentRoot: string, units: LoadedUnit[]): Finding[] {
  const findings: Finding[] = [];
  const catalog = loadConceptCatalog(contentRoot);
  if (catalog === null && existsSync(conceptCatalogPath(contentRoot))) {
    reporterFor(findings, "PRECHECK", WHOLE_BANK)("concept-catalog-invalid", "content/concept-catalog.json is not a list of units with their concepts");
  }
  for (const { unit } of units) {
    if (!unit) continue;
    if (catalog) checkAgainstCatalog(unit, catalog, reporterFor(findings, "PRECHECK", unit.unit));
    checkLessonConcepts(unit, findings);
  }
  return findings;
}
