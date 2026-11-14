import { normaliseOutput } from "@project/content-model";
import type { Item, UnitFile } from "@project/content-model";
import { curriculumPosition } from "../bank/curriculum.js";
import type { CurriculumUnit } from "../bank/curriculum.js";
import type { Finding } from "../bank/finding.js";
import { allItems } from "../bank/loadBank.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { sha256 } from "../bank/sha256.js";
import type { UnitTraces } from "../gateA/runGateA.js";
import { loadConceptCatalog } from "../precheck/conceptCatalog.js";
import type { ConceptCatalog } from "../precheck/conceptCatalog.js";
import { writeJsonFile } from "../runLog/jsonFile.js";
import { gateInputPath } from "./gateFiles.js";

type GateInputsRequest = {
  passDirectory: string;
  runId: string;
  contentRoot: string;
  units: LoadedUnit[];
  /** The traces Gate A generated in this pass. */
  traces: UnitTraces[];
  /** The mechanical part of Gate D, for the whole bank. */
  constructFindings: Finding[];
  curriculum: CurriculumUnit[];
};

const README = "content/README.md";

/** One order per (run, item, list): the same run always shuffles the same way, another run differently. */
function shuffled<Value>(values: Value[], seed: string): Value[] {
  return values
    .map((value, index) => ({ value, key: sha256(`${seed}:${index}`) }))
    .sort((left, right) => (left.key < right.key ? -1 : 1))
    .map(({ value }) => value);
}

/**
 * An item as the blind solver sees it (PRD 8.3, Gate B): what a learner sees, and nothing that
 * states or hints at the answer. Fields are picked one by one so that a new item field stays hidden.
 */
function blindItemOf(item: Item, runId: string) {
  const { entry, tests, probe, expectedOutput } = item.solution;
  const isCodeWrite = item.format === "CODE_WRITE";
  const isOrderOutput = item.variant === "ORDER_OUTPUT";
  return {
    id: item.id,
    format: item.format,
    variant: item.variant,
    prompt: item.prompt,
    code: isCodeWrite ? undefined : item.code,
    dom: item.dom,
    options: item.options && shuffled(item.options.map((option) => option.text), `${runId}:${item.id}:options`),
    probe: item.format === "TRACE" ? probe : undefined,
    shuffledOutput: isOrderOutput ? shuffled(normaliseOutput(expectedOutput ?? "").split("\n"), `${runId}:${item.id}:output`) : undefined,
    entry: isCodeWrite ? entry : undefined,
    testInputs: isCodeWrite ? tests?.map((test) => test.input) : undefined,
    context: isCodeWrite ? item.code : undefined,
  };
}

function solverInput(unit: UnitFile, items: Item[], runId: string) {
  return {
    gate: "B",
    runId,
    unit: unit.unit,
    outputRules: { file: README, section: "Execution model" },
    items: items.map((item) => blindItemOf(item, runId)),
  };
}

/** Gate C: the complete authored unit, with what each snippet really printed in Gate A. */
function clarityInput(unit: UnitFile, items: Item[], runId: string, traces: UnitTraces | undefined) {
  return {
    gate: "C",
    runId,
    unit: unit.unit,
    title: unit.title,
    concepts: unit.concepts,
    misconceptions: unit.misconceptions,
    lessons: unit.lessons,
    items: items.map((item) => ({ ...item, observedOutput: traces?.items[item.id]?.output.join("\n") ?? null })),
  };
}

/** Gate D: the complete authored items, with the unit's place in the curriculum and what the catalog fixes for it. */
function fitInput(unit: UnitFile, items: Item[], request: GateInputsRequest, catalog: ConceptCatalog | null) {
  const position = Math.max(curriculumPosition(request.curriculum, unit.unit), 0);
  return {
    gate: "D",
    runId: request.runId,
    unit: unit.unit,
    title: unit.title,
    track: unit.track,
    order: unit.order,
    earlierUnits: request.curriculum.slice(0, position).map((entry) => entry.title),
    concepts: catalog?.[unit.unit] ?? unit.concepts,
    lessonRecipes: { file: README, section: "Lesson recipes" },
    lessons: unit.lessons.map(({ id, title, itemIds }) => ({ id, title, itemIds })),
    constructFindings: request.constructFindings.filter((finding) => finding.unit === unit.unit),
    items,
  };
}

/** Writes `gate-b|c|d/<unit>.input.json` for every valid unit. What each gate may see is decided here and nowhere else. */
export function exportGateInputs(request: GateInputsRequest): void {
  const { passDirectory, runId } = request;
  const catalog = loadConceptCatalog(request.contentRoot);
  for (const loaded of request.units) {
    const { unit } = loaded;
    if (!unit) continue;
    const items = allItems([loaded]);
    const traces = request.traces.find((unitTraces) => unitTraces.unit === unit.unit);
    writeJsonFile(gateInputPath(passDirectory, "B", unit.unit), solverInput(unit, items, runId));
    writeJsonFile(gateInputPath(passDirectory, "C", unit.unit), clarityInput(unit, items, runId, traces));
    writeJsonFile(gateInputPath(passDirectory, "D", unit.unit), fitInput(unit, items, request, catalog));
  }
}
