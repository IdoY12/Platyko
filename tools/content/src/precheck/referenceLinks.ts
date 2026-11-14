import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Item } from "@project/content-model";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { fetchPage, mapConcurrently } from "../bank/network.js";
import type { FetchFunction } from "../bank/network.js";

const CACHE_FILE_NAME = "reference-links.json";
const CACHE_LIFETIME_MILLISECONDS = 24 * 60 * 60 * 1000;

export type ReferenceLinkOptions = {
  cacheDir: string;
  /** Skip the network entirely; the result then says `skipped: true` and has no findings. */
  offline?: boolean;
  fetchFunction?: FetchFunction;
};

/** URL -> ISO time of the last check that ended in a 200. */
type LinkCache = Record<string, string>;

function readLinkCache(cachePath: string): LinkCache {
  try {
    return JSON.parse(readFileSync(cachePath, "utf8")) as LinkCache;
  } catch {
    return {};
  }
}

/** Null when the link works; otherwise what went wrong. */
async function linkProblem(url: string, fetchFunction?: FetchFunction): Promise<string | null> {
  try {
    const response = await fetchPage(url, fetchFunction);
    return response.status === 200 ? null : `the server answered ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Reference-link check (PRD 8.2): every reference URL must end, after redirects, in a 200.
 * A link that worked within the last 24 hours is not requested again.
 */
export async function checkReferenceLinks(
  items: Item[],
  options: ReferenceLinkOptions,
): Promise<{ findings: Finding[]; skipped: boolean }> {
  if (options.offline) return { findings: [], skipped: true };
  const cachePath = join(options.cacheDir, CACHE_FILE_NAME);
  const cache = existsSync(cachePath) ? readLinkCache(cachePath) : {};
  const now = Date.now();
  const isFresh = (url: string) => now - Date.parse(cache[url] ?? "") < CACHE_LIFETIME_MILLISECONDS;
  const urlsToCheck = [...new Set(items.map((item) => item.reference.url))].filter((url) => !isFresh(url));
  const problems = await mapConcurrently(urlsToCheck, (url) => linkProblem(url, options.fetchFunction));
  const problemByUrl = new Map<string, string>();
  urlsToCheck.forEach((url, index) => {
    const problem = problems[index];
    if (problem === null) cache[url] = new Date(now).toISOString();
    else problemByUrl.set(url, problem);
  });
  mkdirSync(options.cacheDir, { recursive: true });
  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  const findings: Finding[] = [];
  for (const item of items) {
    const problem = problemByUrl.get(item.reference.url);
    if (problem !== undefined) {
      const report = reporterFor(findings, "PRECHECK", item.unit, item.id);
      report("reference-link-broken", `reference ${item.reference.url} does not return 200: ${problem}`);
    }
  }
  return { findings, skipped: false };
}
