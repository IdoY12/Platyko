import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { UnitFile } from "@project/content-model";
import { loadBank } from "../bank/loadBank.js";
import { copyFixtureContentRoot } from "../fixtures/passFixtures.js";
import { checkConceptCatalog } from "./conceptCatalog.js";

function rootWithCatalog(catalogUnit: string, change: (concepts: UnitFile["concepts"]) => void = () => undefined): string {
  const contentRoot = copyFixtureContentRoot();
  const concepts = structuredClone(loadBank(contentRoot).units[0].unit!.concepts);
  change(concepts);
  writeFileSync(join(contentRoot, "concept-catalog.json"), JSON.stringify({ units: [{ track: "BEGINNER", unit: catalogUnit, concepts }] }));
  return contentRoot;
}

const checksOf = (contentRoot: string) => checkConceptCatalog(contentRoot, loadBank(contentRoot).units).map((finding) => finding.check);

describe("checkConceptCatalog", () => {
  it("passes a unit that matches the catalog, and skips the catalog check in a root without one", () => {
    expect(checksOf(rootWithCatalog("fixture-unit"))).toEqual([]);
    expect(checksOf(copyFixtureContentRoot())).toEqual([]);
  });

  it("reports a changed title, prerequisite list or order, and a unit the catalog does not know", () => {
    expect(checksOf(rootWithCatalog("fixture-unit", (concepts) => (concepts[0].title = "Another title")))).toEqual(["concept-catalog-mismatch"]);
    expect(checksOf(rootWithCatalog("fixture-unit", (concepts) => (concepts[1].prerequisites = ["loop-running-total"])))).toEqual(["concept-catalog-mismatch"]);
    expect(new Set(checksOf(rootWithCatalog("fixture-unit", (concepts) => concepts.reverse())))).toEqual(new Set(["concept-catalog-mismatch"]));
    expect(checksOf(rootWithCatalog("another-unit"))).toEqual(["concept-catalog-mismatch"]);
  });

  it("reports a catalog file that is not a catalog", () => {
    const contentRoot = copyFixtureContentRoot();
    writeFileSync(join(contentRoot, "concept-catalog.json"), "{}");
    expect(checksOf(contentRoot)).toEqual(["concept-catalog-invalid"]);
  });

  it("reports an item whose concept is not the one its lesson teaches", () => {
    const contentRoot = copyFixtureContentRoot();
    const { units } = loadBank(contentRoot);
    units[0].unit!.items[1].concept = "array-index-and-length";
    const findings = checkConceptCatalog(contentRoot, units);
    expect(findings).toMatchObject([{ check: "lesson-concept-mismatch", itemId: units[0].unit!.items[1].id }]);
    expect(findings[0].message).toContain('teaches "loop-running-total"');
  });
});
