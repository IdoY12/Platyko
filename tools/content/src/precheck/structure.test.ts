import { describe, expect, it } from "vitest";
import type { AuthoredItem, UnitFile } from "@project/content-model";
import { loadBank } from "../bank/loadBank.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { FIXTURE_CONTENT_ROOT, FIXTURE_CURRICULUM, FIXTURE_ITEMS_PER_UNIT, loadFixtureUnit } from "../fixtures/fixtureUnit.js";
import { unitFileSchema } from "../schema/unitFileSchema.js";
import { checkStructure } from "./structure.js";
import type { StructureOptions } from "./structure.js";

const FIXTURE_OPTIONS: StructureOptions = { curriculum: FIXTURE_CURRICULUM, itemsPerUnit: FIXTURE_ITEMS_PER_UNIT };
const HEBREW_LETTER = String.fromCodePoint(0x5e9);
const words = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(" ");

function fixtureFile(): LoadedUnit & { unit: UnitFile } {
  const [loaded] = loadBank(FIXTURE_CONTENT_ROOT).units;
  return { ...loaded, unit: loadFixtureUnit() };
}

/** The item whose id ends in `idEnding`, e.g. "predict-01" or "function-return-value.parsons-01". */
function itemOf(unit: UnitFile, idEnding: string): AuthoredItem {
  const item = unit.items.find((candidate) => candidate.id.endsWith(idEnding));
  if (!item) throw new Error(`The fixture has no item ending in ${idEnding}.`);
  return item;
}

function renameItem(unit: UnitFile, item: AuthoredItem, newId: string): void {
  for (const lesson of unit.lessons) lesson.itemIds = lesson.itemIds.map((itemId) => (itemId === item.id ? newId : itemId));
  item.id = newId;
}

/** Checks reported for the fixture after one change, sorted. */
function checksAfter(change: (unit: UnitFile, file: LoadedUnit) => void, options = FIXTURE_OPTIONS): string[] {
  const file = fixtureFile();
  change(file.unit, file);
  return checkStructure([file], options)
    .map((finding) => finding.check)
    .sort();
}

type ItemChange = (item: AuthoredItem, unit: UnitFile) => void;

/** Rows of [what is changed, item id ending, the change, the checks expected to fire]. */
function expectItemRules(rows: [string, string, ItemChange, string[]][]): void {
  it.each(rows)("%s", (_what, idEnding, change, expected) => {
    expect(checksAfter((unit) => change(itemOf(unit, idEnding), unit))).toEqual(expected);
  });
}

const ORDER_OUTPUT = "function-return-value.parsons-01";
const PARSONS = "array-index-and-length.parsons-01";

describe("checkStructure on the fixture", () => {
  it("passes the unchanged fixture", () => {
    expect(checkStructure([fixtureFile()], FIXTURE_OPTIONS)).toEqual([]);
  });

  it("files every finding under the pre-check, the unit and the item", () => {
    const file = fixtureFile();
    itemOf(file.unit, "predict-01").prompt = "";
    expect(checkStructure([file], FIXTURE_OPTIONS)).toEqual([
      { gate: "PRECHECK", check: "text-empty", itemId: "beg.fixture-unit.loop-running-total.predict-01", unit: "fixture-unit", message: "prompt is empty" },
    ]);
  });
});

describe("unit file rules", () => {
  const inFolder = (file: LoadedUnit, folder: string, name: string) => {
    file.filePath = file.filePath.replace("beginner/09-fixture-unit.json", `${folder}/${name}`);
  };

  it.each<[string, (unit: UnitFile, file: LoadedUnit) => void, string[]]>([
    ["a folder of another track", (_unit, file) => inFolder(file, "intermediate", "09-fixture-unit.json"), ["unit-folder"]],
    ["a file number that is not the order", (_unit, file) => inFolder(file, "beginner", "08-fixture-unit.json"), ["unit-file-name"]],
    ["a file slug that is not the unit", (_unit, file) => inFolder(file, "beginner", "09-other.json"), ["unit-file-name"]],
    ["a one-digit file number", (_unit, file) => inFolder(file, "beginner", "9-fixture-unit.json"), ["unit-file-name"]],
    ["an order the curriculum does not give", (unit) => void (unit.order = 3), ["unit-file-name", "unit-order"]],
    ["an empty title", (unit) => void (unit.title = " "), ["text-empty"]],
    ["an empty summary", (unit) => void (unit.summary = ""), ["text-empty"]],
    ["Hebrew in the summary", (unit) => void (unit.summary += HEBREW_LETTER), ["text-hebrew"]],
    ["a concept with an unknown prerequisite", (unit) => void unit.concepts[0].prerequisites.push("nowhere"), ["prerequisite-undeclared"]],
    ["a concept that requires itself", (unit) => void unit.concepts[0].prerequisites.push(unit.concepts[0].id), ["prerequisite-undeclared"]],
    ["a concept id that is not kebab-case", (unit) => void unit.concepts.push({ id: "Bad_Id", title: "Bad", prerequisites: [] }), ["id-format"]],
    ["a misconception declared twice", (unit) => void unit.misconceptions.push(unit.misconceptions[0]), ["misconception-duplicate"]],
    ["a misconception without a description", (unit) => void (unit.misconceptions[0].description = ""), ["text-empty"]],
    ["a source without a hash", (unit) => void unit.sources.push({ url: "https://sources.example/a", retrievedAt: "2026-11-14", sha256: "" }), ["source-ledger-entry"]],
    ["a source with a malformed date", (unit) => void unit.sources.push({ url: "https://sources.example/a", retrievedAt: "14/11/2026", sha256: "a".repeat(64) }), ["source-ledger-entry"]],
    ["a wrong lesson id", (unit) => void (unit.lessons[1].id = "fixture-unit.lesson-3"), ["lesson-id"]],
    ["an item listed by two lessons", (unit) => void unit.lessons[0].itemIds.push(unit.lessons[1].itemIds[0]), ["lesson-item-repeated"]],
    ["an item listed twice by one lesson", (unit) => void unit.lessons[0].itemIds.push(unit.lessons[0].itemIds[0]), ["lesson-item-repeated"]],
    ["an item that no lesson lists", (unit) => void unit.lessons[0].itemIds.pop(), ["lesson-item-missing"]],
    ["a lesson that lists an unknown item", (unit) => void unit.lessons[0].itemIds.push("beg.fixture-unit.none.predict-09"), ["lesson-item-unknown"]],
    ["a retired item still in a lesson", (unit) => void (unit.items[0].retired = true), ["lesson-item-retired", "unit-size"]],
    ["a concept card body of 61 words", (unit) => void (unit.lessons[0].conceptCard.body = words(61)), ["concept-card-body-too-long"]],
    ["a concept card without a title", (unit) => void (unit.lessons[0].conceptCard.title = ""), ["text-empty"]],
    ["a concept card without code", (unit) => void (unit.lessons[0].conceptCard.code = []), ["concept-card-code-missing"]],
    ["a concept card without output", (unit) => void (unit.lessons[0].conceptCard.expectedOutput = ""), ["concept-card-output-missing"]],
    ["a concept card line of 37 characters", (unit) => void unit.lessons[0].conceptCard.code.push("x".repeat(37)), ["code-line-too-long"]],
  ])("reports %s", (_what, change, expected) => {
    expect(checksAfter(change)).toEqual(expected);
  });

  it("accepts a concept card body of exactly 60 words", () => {
    expect(checksAfter((unit) => void (unit.lessons[0].conceptCard.body = words(60)))).toEqual([]);
  });

  it("requires exactly four lessons", () => {
    expect(checksAfter((unit) => void unit.lessons.pop())).toEqual(["lesson-count", "lesson-item-missing", "lesson-item-missing"]);
  });

  it("requires the unit size of the track and a place in the curriculum", () => {
    expect(checksAfter(() => undefined, {})).toEqual(["unit-not-in-curriculum", "unit-size"]);
  });
});

describe("item rules shared by every format", () => {
  expectItemRules([
    ["an id without a concept segment", "predict-01", (item, unit) => renameItem(unit, item, "beg.fixture-unit.predict-01"), ["item-id-format"]],
    ["an id with a one-digit number", "predict-01", (item, unit) => renameItem(unit, item, "beg.fixture-unit.loop.predict-1"), ["item-id-format"]],
    ["an id with upper case", "predict-01", (item, unit) => renameItem(unit, item, "beg.fixture-unit.Loop.predict-01"), ["item-id-format"]],
    ["an id of another track", "predict-01", (item, unit) => renameItem(unit, item, "int.fixture-unit.loop.predict-01"), ["item-id-track"]],
    ["an id of another unit", "predict-01", (item, unit) => renameItem(unit, item, "beg.loops.loop.predict-01"), ["item-id-unit"]],
    ["an id of another format", "predict-01", (item, unit) => renameItem(unit, item, "beg.fixture-unit.loop.trace-09"), ["item-id-format-slug"]],
    ["an undeclared concept", "predict-01", (item) => void (item.concept = "nowhere"), ["concept-undeclared"]],
    ["an undeclared prerequisite", "predict-01", (item) => void item.prerequisites.push("nowhere"), ["prerequisite-undeclared"]],
    ["an undeclared misconception", "predict-01", (item) => void (item.options![1].misconception = "nowhere"), ["misconception-undeclared"]],
    ["a wrong option without a misconception", "predict-01", (item) => void delete item.options![1].misconception, ["misconception-missing"]],
    ["a wrong TRACE option without a misconception", "trace-01", (item) => void delete item.options![2].misconception, ["misconception-missing"]],
    ["a wrong CONCEPT_MCQ option without a misconception", "concept-01", (item) => void delete item.options![1].misconception, ["misconception-missing"]],
    ["a misconception on the correct option", "predict-01", (item) => void (item.options![0].misconception = "loop-includes-bound"), ["misconception-on-correct-option"]],
    ["an empty prompt", "trace-01", (item) => void (item.prompt = "  "), ["text-empty"]],
    ["a prompt of 31 words", "trace-01", (item) => void (item.prompt = words(31)), ["prompt-too-long"]],
    ["an empty explanation", "trace-01", (item) => void (item.explanation = ""), ["text-empty"]],
    ["an explanation of 61 words", "trace-01", (item) => void (item.explanation = words(61)), ["explanation-too-long"]],
    ["empty option feedback", "trace-01", (item) => void (item.options![0].feedback = ""), ["text-empty"]],
    ["option feedback of 46 words", "trace-01", (item) => void (item.options![0].feedback = words(46)), ["feedback-too-long"]],
    ["an empty option text", "concept-01", (item) => void (item.options![1].text = ""), ["text-empty"]],
    ["two options with the same text", "trace-01", (item) => void (item.options![2].text = item.options![1].text), ["option-duplicate"]],
    ["an empty hint", "trace-01", (item) => void (item.hints[1] = ""), ["text-empty"]],
    ["a repeated hint", "trace-01", (item) => void (item.hints[2] = item.hints[0]), ["hint-duplicate"]],
    ["a hint that contains the correct option", "fix-01", (item) => void (item.hints[2] = "Use cart.sum = cart.sum + extra; here."), ["hint-reveals-answer"]],
    ["a hint that contains the expected output", ORDER_OUTPUT, (item) => void (item.hints[2] = "It prints start\ninside task\ntask done"), ["hint-reveals-answer"]],
    ["Hebrew in a hint", "trace-01", (item) => void (item.hints[0] += HEBREW_LETTER), ["text-hebrew"]],
    ["Hebrew in option feedback", "trace-01", (item) => void (item.options![0].feedback += HEBREW_LETTER), ["text-hebrew"]],
    ["an MDN reference on another site", "trace-01", (item) => void (item.reference.url = "https://example.com/en-US/docs/for"), ["reference-url"]],
    ["an MDN reference over http", "trace-01", (item) => void (item.reference.url = item.reference.url.replace("https", "http")), ["reference-url"]],
    ["an MDN reference in another locale", "trace-01", (item) => void (item.reference.url = item.reference.url.replace("en-US", "fr")), ["reference-locale"]],
    ["an ECMA-262 reference that points at MDN", "trace-01", (item) => void (item.reference.source = "ECMA-262"), ["reference-url"]],
    ["a reference without a title", "trace-01", (item) => void (item.reference.title = ""), ["text-empty"]],
    ["an empty author", "trace-01", (item) => void (item.author = ""), ["text-empty"]],
    ["version 0", "trace-01", (item) => void (item.version = 0), ["version-invalid"]],
    ["a fractional version", "trace-01", (item) => void (item.version = 1.5), ["version-invalid"]],
    ["a duel-eligible TRACE", "trace-01", (item) => Object.assign(item, { duelEligible: true, timeLimitSec: 30 }), ["duel-format-not-eligible"]],
    ["a duel-eligible item without a time limit", "predict-01", (item) => void delete item.timeLimitSec, ["duel-time-limit-missing"]],
    ["a time limit of 14 seconds", "predict-01", (item) => void (item.timeLimitSec = 14), ["duel-time-limit-range"]],
    ["a time limit of 46 seconds", "predict-01", (item) => void (item.timeLimitSec = 46), ["duel-time-limit-range"]],
    ["a time limit on an item that is not duel-eligible", "trace-01", (item) => void (item.timeLimitSec = 30), ["duel-time-limit-forbidden"]],
    ["13 lines of code", "predict-01", (item) => void (item.code = Array.from({ length: 13 }, () => "console.log(9);")), ["code-too-many-lines"]],
    ["a line of 37 characters", "predict-01", (item) => void (item.code![0] = `let total = 0; // ${"x".repeat(19)}`), ["code-line-too-long"]],
    ["a tab", "predict-01", (item) => void (item.code![2] = "\ttotal = total + n;"), ["code-tab"]],
    ["trailing whitespace", "predict-01", (item) => void (item.code![0] += " "), ["code-trailing-whitespace"]],
    ["indentation of three spaces", "predict-01", (item) => void (item.code![2] = "   total = total + n;"), ["code-indentation"]],
    ["a line break inside a line", "predict-01", (item) => void (item.code![0] = "let total = 0;\nlet other = 1;"), ["code-line-break"]],
  ]);

  it("accepts the limits themselves and answers too short to be revealed", () => {
    expect(
      checksAfter((unit) => {
        const predict = itemOf(unit, "predict-01");
        Object.assign(predict, { prompt: words(30), explanation: words(60), timeLimitSec: 15 });
        predict.hints[2] = "Add 2, 3 and 4 to get 9.";
        predict.options![0].feedback = words(45);
        predict.code![0] = `let total = 0; // ${"x".repeat(18)}`;
        itemOf(unit, "concept-01").timeLimitSec = 45;
        itemOf(unit, "trace-01").reference = { title: "for-in", url: "https://tc39.es/ecma262/#sec-for-in", source: "ECMA-262" };
      }),
    ).toEqual([]);
  });

  it("does not require a misconception on wrong FIX_BUG options or FILL_BLANK chips", () => {
    const unit = loadFixtureUnit();
    expect(itemOf(unit, "fix-01").options![2].misconception).toBeUndefined();
    expect(itemOf(unit, "fill-01").options![3].misconception).toBeUndefined();
  });
});

describe("per-format rules", () => {
  const withoutCorrectOption: ItemChange = (item) => Object.assign(item.options![0], { correct: false, misconception: "loop-includes-bound" });
  const withTwoCorrectOptions: ItemChange = (item) => {
    item.options![1].correct = true;
    delete item.options![1].misconception;
  };
  const expressionEntry: ItemChange = (item) => {
    item.solution.entry = { kind: "expression", variables: ["numbers", "limit"] };
    item.solution.tests = item.solution.tests!.map((test) => ({ ...test, input: { limit: 1, numbers: [1] } }));
  };

  expectItemRules([
    ["PREDICT_OUTPUT without options", "predict-01", (item) => void delete item.options, ["field-missing"]],
    ["PREDICT_OUTPUT without code", "predict-01", (item) => void delete item.code, ["field-missing"]],
    ["PREDICT_OUTPUT with empty code", "predict-01", (item) => void (item.code = []), ["field-missing"]],
    ["PREDICT_OUTPUT without expectedOutput", "predict-01", (item) => void delete item.solution.expectedOutput, ["field-missing"]],
    ["PREDICT_OUTPUT with lineOrder", "predict-01", (item) => void (item.solution.lineOrder = [1, 0]), ["field-forbidden"]],
    ["PREDICT_OUTPUT with a variant", "predict-01", (item) => void (item.variant = "ORDER_OUTPUT"), ["field-forbidden"]],
    ["four options", "predict-01", (item) => void item.options!.push({ text: "0", correct: false, feedback: "No.", misconception: "loop-includes-bound" }), ["options-count"]],
    ["two options", "trace-01", (item) => void item.options!.pop(), ["options-count"]],
    ["no correct option", "trace-01", withoutCorrectOption, ["options-correct-count"]],
    ["two correct options", "trace-01", withTwoCorrectOptions, ["options-correct-count"]],
    ["two correct replacement lines", "fix-01", withTwoCorrectOptions, ["options-correct-count"]],
    ["two correct claims", "concept-01", withTwoCorrectOptions, ["options-correct-count"]],
    ["a correct option that is not the expected output", "predict-01", (item) => void (item.solution.expectedOutput = "14"), ["predict-answer-mismatch"]],
    ["TRACE without a probe", "trace-01", (item) => void delete item.solution.probe, ["field-missing"]],
    ["a probe before line 1", "trace-01", (item) => void (item.solution.probe!.afterLine = 0), ["trace-probe-line-out-of-range"]],
    ["a probe after the last line", "trace-01", (item) => void (item.solution.probe!.afterLine = 7), ["trace-probe-line-out-of-range"]],
    ["a probe visit of 0", "trace-01", (item) => void (item.solution.probe!.visit = 0), ["trace-probe-visit"]],
    ["a probe variable that is not a name", "trace-01", (item) => void (item.solution.probe!.variable = "stock - 1"), ["trace-probe-variable"]],
    ["PARSONS without lineOrder", PARSONS, (item) => void delete item.solution.lineOrder, ["field-missing"]],
    ["PARSONS with options", PARSONS, (item, unit) => void (item.options = itemOf(unit, "fix-01").options), ["field-forbidden"]],
    ["PARSONS with nine lines", PARSONS, (item) => Object.assign(item, { code: Array.from({ length: 9 }, (_, index) => `step${index}();`), solution: { lineOrder: [8, 7, 6, 5, 4, 3, 2, 1, 0], expectedOutput: "1" } }), ["parsons-too-many-lines"]],
    ["a lineOrder that skips a line", PARSONS, (item) => void (item.solution.lineOrder = [2, 4, 1, 3]), ["parsons-line-order"]],
    ["a lineOrder that repeats a line", PARSONS, (item) => void (item.solution.lineOrder = [2, 4, 1, 3, 3]), ["parsons-line-order"]],
    ["a lineOrder with an index out of range", PARSONS, (item) => void (item.solution.lineOrder = [2, 4, 1, 3, 5]), ["parsons-line-order"]],
    ["a lineOrder equal to the display order", PARSONS, (item) => void (item.solution.lineOrder = [0, 1, 2, 3, 4]), ["parsons-line-order-identity"]],
    ["an accepted order equal to lineOrder", PARSONS, (item) => void item.solution.acceptedOrders!.push(item.solution.lineOrder!), ["parsons-accepted-order"]],
    ["an accepted order listed twice", PARSONS, (item) => void item.solution.acceptedOrders!.push(item.solution.acceptedOrders![0]), ["parsons-accepted-order"]],
    ["an accepted order that is no permutation", PARSONS, (item) => void item.solution.acceptedOrders!.push([4, 2, 1]), ["parsons-accepted-order"]],
    ["an accepted order equal to the display order", PARSONS, (item) => void item.solution.acceptedOrders!.push([0, 1, 2, 3, 4]), ["parsons-accepted-order"]],
    ["ORDER_OUTPUT with lineOrder", ORDER_OUTPUT, (item) => void (item.solution.lineOrder = [1, 0, 2, 3, 4, 5, 6]), ["field-forbidden"]],
    ["ORDER_OUTPUT with two output lines", ORDER_OUTPUT, (item) => void (item.solution.expectedOutput = "start\nend"), ["order-output-lines"]],
    ["ORDER_OUTPUT with a repeated output line", ORDER_OUTPUT, (item) => void (item.solution.expectedOutput = "start\nstart\nend"), ["order-output-lines"]],
    ["two chips", "fill-01", (item) => Object.assign(item, { options: item.options!.slice(0, 2) }), ["fill-chip-count"]],
    ["seven chips", "fill-01", (item) => void item.options!.push(...["a", "b", "c"].map((text) => ({ text, correct: false, feedback: "No." }))), ["fill-chip-count"]],
    ["four blanks", "fill-01", (item) => Object.assign(item, { code: [...item.code!, "___ ___"], solution: { ...item.solution, blanks: [["length"], ["1"], ["1"], ["1"]] } }), ["fill-blank-count"]],
    ["more blank tokens than blanks", "fill-01", (item) => void item.code!.push("___;"), ["fill-blank-token-count"]],
    ["fewer blank tokens than blanks", "fill-01", (item) => void item.solution.blanks!.push(["1"]), ["fill-blank-token-count"]],
    ["a blank that accepts something that is not a chip", "fill-01", (item) => void item.solution.blanks![0].push("count"), ["fill-accepted-chip-unknown"]],
    ["a blank that accepts nothing", "fill-01", (item) => void (item.solution.blanks![1] = []), ["fill-blank-empty", "fill-chip-correct-flag"]],
    ["a chip marked correct that no blank accepts", "fill-01", (item) => void (item.options![3].correct = true), ["fill-chip-correct-flag"]],
    ["an accepted chip not marked correct", "fill-01", (item) => void (item.options![0].correct = false), ["fill-chip-correct-flag"]],
    ["FILL_BLANK without blanks", "fill-01", (item) => void delete item.solution.blanks, ["field-missing"]],
    ["a bugLine of 0", "fix-01", (item) => void (item.solution.bugLine = 0), ["fix-bug-line-out-of-range"]],
    ["a bugLine after the last line", "fix-01", (item) => void (item.solution.bugLine = 5), ["fix-bug-line-out-of-range"]],
    ["a replacement of two lines", "fix-01", (item) => void (item.options![2].text = "cart.sum = 1;\ncart.sum = 2;"), ["code-line-break"]],
    ["a replacement of 37 characters", "fix-01", (item) => void (item.options![2].text = `cart.sum = extra; // ${"x".repeat(16)}`), ["code-line-too-long"]],
    ["a replacement equal to the buggy line", "fix-01", (item) => void (item.options![2].text = item.code![2]), ["fix-option-same-as-bug"]],
    ["CODE_WRITE without an entry", "write-01", (item) => void delete item.solution.entry, ["field-missing"]],
    ["CODE_WRITE without a reference", "write-01", (item) => void (item.solution.reference = []), ["field-missing"]],
    ["CODE_WRITE with options", "write-01", (item, unit) => void (item.options = itemOf(unit, "fix-01").options), ["field-forbidden"]],
    ["CODE_WRITE with expectedOutput", "write-01", (item) => void (item.solution.expectedOutput = "9"), ["field-forbidden"]],
    ["two tests", "write-01", (item) => void (item.solution.tests!.length = 2), ["write-test-count"]],
    ["two wrong solutions", "write-01", (item) => void item.solution.wrongSolutions!.pop(), ["write-wrong-solution-count"]],
    ["a function test input that is not an array", "write-01", (item) => void (item.solution.tests![0].input = { numbers: [1] }), ["write-test-input"]],
    ["a function test input with too many arguments", "write-01", (item) => void (item.solution.tests![0].input = [[1], 2]), ["write-test-input"]],
    ["an expression test input with a missing key", "write-01", (item, unit) => (expressionEntry(item, unit), void (item.solution.tests![1].input = { numbers: [1] })), ["write-test-input"]],
    ["an expression test input with an extra key", "write-01", (item, unit) => (expressionEntry(item, unit), void (item.solution.tests![1].input = { numbers: [1], limit: 2, other: 3 })), ["write-test-input"]],
    ["an expression test input that is an array", "write-01", (item, unit) => (expressionEntry(item, unit), void (item.solution.tests![1].input = [[1], 2])), ["write-test-input"]],
    ["an entry name that is not a name", "write-01", (item) => void (item.solution.entry = { kind: "function", name: "largest number", params: ["numbers"] }), ["write-entry-name"]],
    ["a reference of 13 lines", "write-01", (item) => void (item.solution.reference = Array.from({ length: 13 }, () => "return 1;")), ["code-too-many-lines"]],
    ["a wrong solution with a line of 37 characters", "write-01", (item) => void (item.solution.wrongSolutions![0] = [`return numbers[0]; // ${"x".repeat(15)}`]), ["code-line-too-long"]],
    ["a reference with a tab", "write-01", (item) => void (item.solution.reference![1] = "\treturn 1;"), ["code-tab"]],
    ["a duel-eligible CODE_WRITE", "write-01", (item) => Object.assign(item, { duelEligible: true, timeLimitSec: 30 }), ["duel-format-not-eligible"]],
    ["CONCEPT_MCQ without code", "concept-01", (item) => void delete item.code, ["field-missing"]],
  ]);

  it("checks a replacement line with the indentation it takes over", () => {
    const checks = checksAfter((unit) => {
      const item = itemOf(unit, "fix-01");
      item.code = ["if (true) {", "  const cart = { sum: 30 };", "    cart.total = cart.sum + 15;", "  console.log(cart.sum);", "}"];
      item.options![0].text = "cart.sum = cart.sum + 15; // 12345";
    });
    expect(checks).toEqual(["code-line-too-long"]);
  });

  it("accepts an expression entry whose test inputs carry exactly its variables", () => {
    expect(checksAfter((unit) => expressionEntry(itemOf(unit, "write-01"), unit))).toEqual([]);
  });

  it("accepts PARSONS without acceptedOrders and with eight lines", () => {
    expect(
      checksAfter((unit) => {
        const item = itemOf(unit, PARSONS);
        item.code = Array.from({ length: 8 }, (_, index) => `step${index}();`);
        item.solution = { lineOrder: [7, 6, 5, 4, 3, 2, 1, 0], expectedOutput: "1" };
      }),
    ).toEqual([]);
  });
});

describe("rules across the bank", () => {
  /** A second valid unit, placed after the fixture unit, with its own ids. */
  function secondFile(): LoadedUnit & { unit: UnitFile } {
    const first = loadFixtureUnit();
    const renamed = first.concepts.reduce(
      (text, concept) => text.replaceAll(concept.id, `${concept.id}-again`),
      JSON.stringify(first).replaceAll("fixture-unit", "second-unit"),
    );
    const unit = { ...(JSON.parse(renamed) as UnitFile), order: 10 };
    return { filePath: fixtureFile().filePath.replace("09-fixture-unit", "10-second-unit"), raw: unit, unit };
  }
  const twoUnitOptions: StructureOptions = {
    curriculum: [...FIXTURE_CURRICULUM.slice(0, 9), { track: "BEGINNER", unit: "second-unit", title: "Second" }, ...FIXTURE_CURRICULUM.slice(9)],
    itemsPerUnit: FIXTURE_ITEMS_PER_UNIT,
  };
  const checkTwo = (change: (first: UnitFile, second: UnitFile) => void, options = twoUnitOptions) => {
    const files = [fixtureFile(), secondFile()];
    change(files[0].unit, files[1].unit);
    return checkStructure(files, options);
  };

  it("passes two valid units", () => {
    expect(checkTwo(() => undefined)).toEqual([]);
  });

  it("reports an item id used twice on both items", () => {
    const findings = checkTwo((first, second) => renameItem(second, second.items[0], first.items[0].id));
    expect(findings.filter((finding) => finding.check === "item-id-duplicate").map((finding) => finding.unit)).toEqual(["fixture-unit", "second-unit"]);
  });

  it("reports a concept id declared twice", () => {
    const findings = checkTwo((first, second) => void second.concepts.push({ ...first.concepts[0], prerequisites: [] }));
    expect(findings.map((finding) => [finding.check, finding.unit])).toEqual([
      ["concept-duplicate", "fixture-unit"],
      ["concept-duplicate", "second-unit"],
    ]);
  });

  it("reports a unit slug used by two files", () => {
    const findings = checkTwo((_first, second) => void (second.unit = "fixture-unit"));
    expect(findings.map((finding) => finding.check)).toContain("unit-duplicate");
  });

  it("lets a prerequisite point at an earlier unit but not at a later one", () => {
    expect(checkTwo((first, second) => void second.items[0].prerequisites.push(first.concepts[1].id))).toEqual([]);
    const findings = checkTwo((first, second) => void first.items[0].prerequisites.push(second.concepts[1].id));
    expect(findings.map((finding) => [finding.check, finding.itemId])).toEqual([["prerequisite-undeclared", loadFixtureUnit().items[0].id]]);
  });

  it("limits the per-unit rules to the chosen unit and keeps the bank-wide rules", () => {
    const change = (first: UnitFile, second: UnitFile) => {
      first.items[0].prompt = "";
      second.items[1].prompt = "";
      renameItem(second, second.items[0], first.items[0].id);
    };
    const summary = (unit: string) =>
      checkTwo(change, { ...twoUnitOptions, unit }).map((finding) => `${finding.unit}: ${finding.check}`).sort();
    expect(summary("fixture-unit")).toEqual(["fixture-unit: item-id-duplicate", "fixture-unit: text-empty", "second-unit: item-id-duplicate"]);
    expect(summary("second-unit")).toEqual(["fixture-unit: item-id-duplicate", "second-unit: item-id-duplicate", "second-unit: item-id-unit", "second-unit: text-empty"]);
  });

  it("requires every curriculum unit and 200 duel-eligible items only for a complete bank", () => {
    const findings = checkStructure([fixtureFile()], { ...FIXTURE_OPTIONS, requireCompleteBank: true });
    const missing = findings.filter((finding) => finding.check === "unit-missing").map((finding) => finding.unit);
    expect(missing).toHaveLength(28);
    expect(missing).toContain("closures");
    expect(missing).not.toContain("fixture-unit");
    expect(findings.filter((finding) => finding.check !== "unit-missing")).toEqual([
      { gate: "PRECHECK", check: "duel-eligible-total", itemId: null, unit: "*", message: "the bank has 6 duel-eligible items; at least 200 are required" },
    ]);
  });
});

describe("files that do not match the schema", () => {
  const fileWith = (change: (raw: Record<string, unknown> & { items: Record<string, unknown>[] }) => void): LoadedUnit => {
    const file = fixtureFile();
    const raw = structuredClone(file.unit) as unknown as Record<string, unknown> & { items: Record<string, unknown>[] };
    change(raw);
    return { filePath: file.filePath, raw, unit: unitFileSchema.safeParse(raw).data ?? null };
  };

  it.each<[string, Parameters<typeof fileWith>[0], string | null, string]>([
    ["an unknown key on the unit", (raw) => void (raw.titel = "x"), null, "(file)"],
    ["an unknown key on an item", (raw) => void (raw.items[1].timeLimit = 30), "beg.fixture-unit.loop-running-total.trace-01", "items.1"],
    ["two hints", (raw) => void (raw.items[0].hints = ["a", "b"]), "beg.fixture-unit.loop-running-total.predict-01", "items.0.hints"],
    ["difficulty 6", (raw) => void (raw.items[0].difficulty = 6), "beg.fixture-unit.loop-running-total.predict-01", "items.0.difficulty"],
    ["a missing reference", (raw) => void delete raw.items[0].reference, "beg.fixture-unit.loop-running-total.predict-01", "items.0.reference"],
    ["an unknown format", (raw) => void (raw.items[0].format = "ESSAY"), "beg.fixture-unit.loop-running-total.predict-01", "items.0.format"],
    ["code as one string", (raw) => void (raw.items[0].code = "let total = 0;"), "beg.fixture-unit.loop-running-total.predict-01", "items.0.code"],
    ["a missing lessons array", (raw) => void delete raw.lessons, null, "lessons"],
  ])("reports %s as a schema finding", (_what, change, itemId, path) => {
    const findings = checkStructure([fileWith(change)], FIXTURE_OPTIONS);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ gate: "PRECHECK", check: "schema", itemId, unit: "fixture-unit" });
    expect(findings[0].message.startsWith(`${path}: `)).toBe(true);
  });

  it("reports a file that is not JSON", () => {
    const findings = checkStructure([{ filePath: "units/beginner/03-broken.json", raw: undefined, unit: null, jsonError: "Unexpected token" }]);
    expect(findings).toEqual([
      { gate: "PRECHECK", check: "unit-file-not-json", itemId: null, unit: "broken", message: "the file is not valid JSON: Unexpected token" },
    ]);
  });
});
