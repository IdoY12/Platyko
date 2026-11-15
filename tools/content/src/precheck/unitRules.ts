import { basename } from "node:path";
import { CODE_MAX_LINES, LESSONS_PER_UNIT } from "@project/content-model";
import type { Track, UnitFile, UnitLesson } from "@project/content-model";
import type { CurriculumUnit } from "../bank/curriculum.js";
import type { FindingReporter } from "../bank/finding.js";
import { UNIT_FILE_NAME_PATTERN, folderOf } from "../bank/loadBank.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { trackFolder } from "../bank/paths.js";
import { checkCodeLimits } from "./codeLimits.js";
import { checkText } from "./itemRules.js";
import { hebrewTextPaths } from "./text.js";

const CONCEPT_CARD_BODY_LIMIT = { words: 60, check: "concept-card-body-too-long" };
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

export type UnitRuleOptions = { curriculum: CurriculumUnit[]; itemsPerUnit: Record<Track, number> };

/** The folder and file name say the same as the file's `track`, `order` and `unit`. */
function checkLocation(loaded: LoadedUnit, unit: UnitFile, report: FindingReporter): void {
  const fileName = basename(loaded.filePath);
  if (folderOf(loaded) !== trackFolder(unit.track)) {
    report("unit-folder", `a ${unit.track} unit belongs in units/${trackFolder(unit.track)}/, not units/${folderOf(loaded)}/`);
  }
  const expectedName = `${String(unit.order).padStart(2, "0")}-${unit.unit}.json`;
  if (!UNIT_FILE_NAME_PATTERN.test(fileName) || fileName !== expectedName) {
    report("unit-file-name", `file "${fileName}" should be named "${expectedName}" (<two-digit order>-<unit>.json)`);
  }
}

function checkCurriculumPlace(unit: UnitFile, curriculum: CurriculumUnit[], report: FindingReporter): void {
  const trackUnits = curriculum.filter((entry) => entry.track === unit.track);
  const place = trackUnits.findIndex((entry) => entry.unit === unit.unit);
  if (place === -1) {
    report("unit-not-in-curriculum", `the curriculum has no ${unit.track} unit "${unit.unit}"`);
  } else if (unit.order !== place + 1) {
    report("unit-order", `order is ${unit.order}; the curriculum places "${unit.unit}" at ${place + 1}`);
  }
}

function checkDeclarations(unit: UnitFile, availableConcepts: Set<string>, report: FindingReporter): void {
  for (const concept of unit.concepts) {
    if (!KEBAB_CASE.test(concept.id)) report("id-format", `concept id "${concept.id}" is not lower-case kebab-case`);
    checkText(report, `title of concept "${concept.id}"`, concept.title);
    for (const prerequisite of concept.prerequisites) {
      if (!availableConcepts.has(prerequisite) || prerequisite === concept.id) {
        report("prerequisite-undeclared", `concept "${concept.id}" requires "${prerequisite}", which is not another concept of this unit or of an earlier unit`);
      }
    }
  }
  unit.misconceptions.forEach((misconception, index) => {
    if (!KEBAB_CASE.test(misconception.id)) report("id-format", `misconception id "${misconception.id}" is not lower-case kebab-case`);
    checkText(report, `description of misconception "${misconception.id}"`, misconception.description);
    if (unit.misconceptions.findIndex((other) => other.id === misconception.id) !== index) {
      report("misconception-duplicate", `misconception "${misconception.id}" is declared twice`);
    }
  });
  for (const source of unit.sources) {
    if (!source.url.startsWith("https://") || !CALENDAR_DATE.test(source.retrievedAt) || !SHA256_HEX.test(source.sha256)) {
      report("source-ledger-entry", `source "${source.url}" needs an https URL, a YYYY-MM-DD retrievedAt and a sha256 of 64 hex digits`);
    }
  }
}

function checkConceptCard(lesson: UnitLesson, report: FindingReporter): void {
  const { title, body, code, expectedOutput } = lesson.conceptCard;
  const label = `concept card of ${lesson.id}`;
  checkText(report, `${label}: title`, title);
  checkText(report, `${label}: body`, body, CONCEPT_CARD_BODY_LIMIT);
  if (code.length === 0) report("concept-card-code-missing", `${label} has no worked example`);
  checkCodeLimits(report, `${label}: code`, code, CODE_MAX_LINES);
  if (expectedOutput === "") report("concept-card-output-missing", `${label} does not state the output of its example`);
}

function checkLessons(unit: UnitFile, report: FindingReporter): void {
  if (unit.lessons.length !== LESSONS_PER_UNIT) {
    report("lesson-count", `has ${unit.lessons.length} lessons; a unit has exactly ${LESSONS_PER_UNIT}`);
  }
  const lessonsByItem = new Map<string, string[]>();
  unit.lessons.forEach((lesson, index) => {
    const expectedId = `${unit.unit}.lesson-${index + 1}`;
    if (lesson.id !== expectedId) report("lesson-id", `lesson ${index + 1} has id "${lesson.id}"; it should be "${expectedId}"`);
    checkText(report, `title of ${lesson.id}`, lesson.title);
    checkConceptCard(lesson, report);
    for (const itemId of lesson.itemIds) lessonsByItem.set(itemId, [...(lessonsByItem.get(itemId) ?? []), lesson.id]);
  });
  const itemsById = new Map(unit.items.map((item) => [item.id, item]));
  for (const [itemId, lessonIds] of lessonsByItem) {
    const item = itemsById.get(itemId);
    if (!item) report("lesson-item-unknown", `${lessonIds[0]} lists "${itemId}", which is not an item of this unit`);
    else if (item.retired) report("lesson-item-retired", `${lessonIds[0]} lists the retired item "${itemId}"`);
    if (lessonIds.length > 1) report("lesson-item-repeated", `"${itemId}" is listed ${lessonIds.length} times: ${lessonIds.join(", ")}`);
  }
  for (const item of unit.items) {
    if (!item.retired && !lessonsByItem.has(item.id)) report("lesson-item-missing", `"${item.id}" belongs to no lesson`);
  }
  // README "Difficulty rises inside a lesson": nothing below the lesson's first item, and the last item the hardest.
  for (const lesson of unit.lessons) {
    const listed = [...new Set(lesson.itemIds)].flatMap((itemId) => itemsById.get(itemId) ?? []);
    const [first] = listed;
    const last = listed.at(-1);
    if (!first || !last) continue;
    for (const item of listed) {
      if (item.difficulty < first.difficulty) {
        report("lesson-difficulty-falls", `${lesson.id}: "${item.id}" is rated ${item.difficulty}, below the lesson's first item "${first.id}" at ${first.difficulty}`);
      }
      if (item.difficulty > last.difficulty) {
        report("lesson-difficulty-falls", `${lesson.id}: "${item.id}" is rated ${item.difficulty}, above the lesson's last item "${last.id}" at ${last.difficulty}`);
      }
    }
  }
}

/** Every rule about a unit file apart from its items (README "Layout" and "Unit file"). */
export function checkUnit(
  loaded: LoadedUnit,
  unit: UnitFile,
  availableConcepts: Set<string>,
  options: UnitRuleOptions,
  report: FindingReporter,
): void {
  checkLocation(loaded, unit, report);
  checkCurriculumPlace(unit, options.curriculum, report);
  checkText(report, "unit title", unit.title);
  checkText(report, "unit summary", unit.summary);
  checkDeclarations(unit, availableConcepts, report);
  checkLessons(unit, report);
  const { items: _items, ...everythingButItems } = unit;
  for (const path of hebrewTextPaths(everythingButItems)) report("text-hebrew", `${path} contains Hebrew characters`);
  const activeItemCount = unit.items.filter((item) => !item.retired).length;
  if (activeItemCount !== options.itemsPerUnit[unit.track]) {
    report("unit-size", `has ${activeItemCount} items in service; a ${unit.track} unit has exactly ${options.itemsPerUnit[unit.track]}`);
  }
}
