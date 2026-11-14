import { join } from "node:path";
import { z } from "zod";
import { readJsonFile } from "../runLog/jsonFile.js";
import { WHOLE_BANK, reporterFor } from "./finding.js";
import type { Finding } from "./finding.js";
import { allItems } from "./loadBank.js";
import type { LoadedUnit } from "./loadBank.js";

const triageSchema = z.object({ items: z.array(z.object({ legacyKey: z.string(), unit: z.string() })) });

function migrationPath(contentRoot: string, fileName: string): string {
  return join(contentRoot, "migration", fileName);
}

/** Where the generated map is stored for the migration of learners' progress. */
export function legacyItemMapPath(contentRoot: string): string {
  return migrationPath(contentRoot, "legacy-item-map.json");
}

/** Legacy key -> the unit that converts it, from `migration/legacy-triage.json`. Null when the root has no triage. */
function loadTriage(contentRoot: string, findings: Finding[]): Map<string, string> | null {
  let raw: unknown = null;
  try {
    raw = readJsonFile(migrationPath(contentRoot, "legacy-triage.json"));
  } catch {
    // Not JSON: reported below like any other file that is not a triage.
  }
  if (raw === undefined) return null;
  const parsed = triageSchema.safeParse(raw);
  if (!parsed.success) reporterFor(findings, "PRECHECK", WHOLE_BANK)("legacy-triage-invalid", "content/migration/legacy-triage.json is not a list of legacy keys with their units");
  return parsed.success ? new Map(parsed.data.items.map(({ legacyKey, unit }) => [legacyKey, unit])) : null;
}

/**
 * The map from every legacy key (`exercise:<level>:<n>`, `puzzle:<n>`, `duel:<n>`) to the id of the
 * item in service that claims it in `legacyKeys`, with sorted keys. Findings: a key claimed by two items; and, against the triage, an item claiming a key
 * triaged to another unit, or — once the bank must be complete — a triaged key that no item claims.
 */
export function buildLegacyItemMap(units: LoadedUnit[], options: { contentRoot: string; requireCompleteBank?: boolean }): { map: Record<string, string>; findings: Finding[] } {
  const findings: Finding[] = [];
  const triage = loadTriage(options.contentRoot, findings);
  const claims = allItems(units).flatMap((item) => (item.legacyKeys ?? []).map((legacyKey) => ({ legacyKey, item })));
  const claimants = new Map<string, string[]>();
  for (const { legacyKey, item } of claims) claimants.set(legacyKey, [...(claimants.get(legacyKey) ?? []), item.id]);

  for (const { legacyKey, item } of claims) {
    const report = reporterFor(findings, "PRECHECK", item.unit, item.id);
    const itemIds = claimants.get(legacyKey) ?? [];
    if (itemIds.length > 1) report("legacy-key-duplicate", `legacy key "${legacyKey}" is claimed by ${itemIds.length} items: ${itemIds.join(", ")}`);
    const triagedUnit = triage?.get(legacyKey);
    if (triagedUnit !== undefined && triagedUnit !== item.unit) report("legacy-key-wrong-unit", `legacy key "${legacyKey}" is triaged to the unit "${triagedUnit}"`);
  }
  if (options.requireCompleteBank) {
    for (const [legacyKey, unit] of triage ?? []) {
      if (!claimants.has(legacyKey)) reporterFor(findings, "PRECHECK", unit)("legacy-key-unclaimed", `no item claims the legacy key "${legacyKey}"`);
    }
  }
  const sortedKeys = [...claimants.keys()].sort();
  return { map: Object.fromEntries(sortedKeys.map((legacyKey) => [legacyKey, (claimants.get(legacyKey) ?? [])[0]])), findings };
}
