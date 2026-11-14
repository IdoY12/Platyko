import type { Item, Track } from "@project/content-model";
import { CURRICULUM } from "../bank/curriculum.js";
import type { CurriculumUnit } from "../bank/curriculum.js";
import { WHOLE_BANK, reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { allItems, loadBank, unitSlugOf } from "../bank/loadBank.js";
import type { FetchFunction } from "../bank/network.js";
import { CONTENT_ROOT, defaultCacheDirectory } from "../bank/paths.js";
import { checkOriginality } from "../originality/checkOriginality.js";
import type { OriginalityResult } from "../originality/checkOriginality.js";
import { fetchSources } from "../originality/sourceCache.js";
import { checkBannedConstructs } from "./bannedConstructs.js";
import { loadConstructsMap, scanConstructs } from "./constructScan.js";
import { checkDuplicates } from "./duplicates.js";
import { checkReferenceLinks } from "./referenceLinks.js";
import { checkStructure } from "./structure.js";

export type PrecheckOptions = {
  contentRoot?: string;
  /** Defaults to `<contentRoot>/.cache`. */
  cacheDir?: string;
  /** No network: reference links are skipped and only cached sources are compared. */
  offline?: boolean;
  /** Also require all 28 units and the duel pool size. */
  requireCompleteBank?: boolean;
  /** Limit the per-unit checks to one unit slug. Duplicates and id uniqueness still cover the whole bank. */
  unit?: string;
  curriculum?: CurriculumUnit[];
  itemsPerUnit?: Record<Track, number>;
  fetchFunction?: FetchFunction;
};

export type PrecheckResult = {
  /** Structure, banned constructs, duplicates, source ledger, originality and reference links. */
  findings: Finding[];
  /** The mechanical part of Gate D, kept apart from the pre-check findings. */
  constructFindings: Finding[];
  originality: Record<string, OriginalityResult>;
  itemCount: number;
  unitCount: number;
  linksSkipped: boolean;
};

function scanAllConstructs(contentRoot: string, items: Item[], curriculum: CurriculumUnit[]): Finding[] {
  const constructsMap = loadConstructsMap(contentRoot);
  if (constructsMap) return items.flatMap((item) => scanConstructs(item, constructsMap, curriculum));
  const findings: Finding[] = [];
  reporterFor(findings, "D", WHOLE_BANK)("constructs-map-invalid", "content/constructs.json is missing or is not an object of unit slugs");
  return findings;
}

/** The whole pre-check (PRD 8.2) plus the Gate D construct scan, over the bank under `contentRoot`. */
export async function runPrecheck(options: PrecheckOptions = {}): Promise<PrecheckResult> {
  const { contentRoot = CONTENT_ROOT, curriculum = CURRICULUM, offline = false, fetchFunction } = options;
  const cacheDir = options.cacheDir ?? defaultCacheDirectory(contentRoot);
  const { units } = loadBank(contentRoot);
  const selectedUnits = units.filter((loaded) => options.unit === undefined || unitSlugOf(loaded) === options.unit);
  const items = allItems(units);
  const selectedItems = allItems(selectedUnits);

  const ledger = await fetchSources(units, { cacheDir, offline, fetchFunction });
  const originality = checkOriginality(units, { cacheDir });
  const links = await checkReferenceLinks(selectedItems, { cacheDir, offline, fetchFunction });
  const inSelectedUnit = (finding: Finding) => options.unit === undefined || finding.unit === options.unit;
  const selectedItemIds = new Set(selectedItems.map((item) => item.id));

  return {
    findings: [
      ...checkStructure(units, options),
      ...selectedUnits.flatMap(({ unit }) => (unit ? checkBannedConstructs(unit) : [])),
      ...checkDuplicates(items),
      ...ledger.findings.filter(inSelectedUnit),
      ...originality.findings.filter(inSelectedUnit),
      ...links.findings,
    ],
    constructFindings: scanAllConstructs(contentRoot, selectedItems, curriculum),
    originality: Object.fromEntries(Object.entries(originality.records).filter(([itemId]) => selectedItemIds.has(itemId))),
    itemCount: items.length,
    unitCount: units.length,
    linksSkipped: links.skipped,
  };
}
