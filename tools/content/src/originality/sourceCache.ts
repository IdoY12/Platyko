import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { UnitFile } from "@project/content-model";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import { fetchPage, mapConcurrently } from "../bank/network.js";
import type { FetchFunction } from "../bank/network.js";
import { sha256 } from "../bank/sha256.js";

/** What is kept of a fetched page: its readable text and the contents of its code blocks. */
export type CachedSource = { text: string; codeBlocks: string[] };

export type SourceCacheOptions = {
  /** Source text is written only below this folder, which is never committed (PRD 9.3). */
  cacheDir: string;
  /** Never touch the network: a source that is not cached yet counts as unreachable. */
  offline?: boolean;
  /** Download again even when the page is cached. */
  refresh?: boolean;
  fetchFunction?: FetchFunction;
};

const NAMED_ENTITIES = new Map([["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"], ["nbsp", " "]]);

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return NAMED_ENTITIES.get(name.toLowerCase()) ?? entity;
  });
}

function withoutTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "));
}

/** Reduces a page to text (no scripts, styles or tags) and pulls out its `<pre>`, `<code>` and fenced code. */
function extractSource(body: string): CachedSource {
  const visible = body.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const preBlocks = [...visible.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)];
  const outsidePre = visible.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, " ");
  const inlineBlocks = [...outsidePre.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/gi)];
  const fencedBlocks = [...visible.matchAll(/```[^\n]*\n([\s\S]*?)```/g)];
  const codeBlocks = [...preBlocks, ...inlineBlocks, ...fencedBlocks]
    .map((match) => decodeEntities(match[1].replace(/<[^>]*>/g, "")).trim())
    .filter((block) => block !== "");
  return { text: withoutTags(visible).replace(/\s+/g, " ").trim(), codeBlocks };
}

function cachePaths(cacheDir: string, url: string): { directory: string; text: string; code: string } {
  const directory = join(cacheDir, "sources");
  return { directory, text: join(directory, `${sha256(url)}.txt`), code: join(directory, `${sha256(url)}.code.json`) };
}

/** The cached copy of a ledger source, or null when it has not been fetched on this machine. */
export function readCachedSource(cacheDir: string, url: string): CachedSource | null {
  const paths = cachePaths(cacheDir, url);
  if (!existsSync(paths.text) || !existsSync(paths.code)) return null;
  return { text: readFileSync(paths.text, "utf8"), codeBlocks: JSON.parse(readFileSync(paths.code, "utf8")) as string[] };
}

type ObtainedSource = { source: CachedSource; unreachable: null } | { source: null; unreachable: string };

function unreachable(reason: string): ObtainedSource {
  return { source: null, unreachable: reason };
}

/** The cached source, downloading it first when needed, or the reason it cannot be had. */
async function obtainSource(url: string, options: SourceCacheOptions): Promise<ObtainedSource> {
  const cached = options.refresh ? null : readCachedSource(options.cacheDir, url);
  if (cached) return { source: cached, unreachable: null };
  if (options.offline) return unreachable("it is not in the cache and the run is offline");
  try {
    const response = await fetchPage(url, options.fetchFunction);
    if (response.status !== 200) return unreachable(`the server answered ${response.status}`);
    const source = extractSource(await response.text());
    const paths = cachePaths(options.cacheDir, url);
    mkdirSync(paths.directory, { recursive: true });
    writeFileSync(paths.text, source.text);
    writeFileSync(paths.code, JSON.stringify(source.codeBlocks));
    return { source, unreachable: null };
  } catch (error) {
    return unreachable(error instanceof Error ? error.message : String(error));
  }
}

function validUnitsOf(units: LoadedUnit[]): UnitFile[] {
  return units.flatMap(({ unit }) => (unit ? [unit] : []));
}

/** Every distinct URL recorded in the source ledgers of the given units. */
export function ledgerUrls(units: LoadedUnit[]): string[] {
  return [...new Set(validUnitsOf(units).flatMap((unit) => unit.sources.map((source) => source.url)))];
}

/**
 * Brings every ledger source into the cache and compares the sha256 of its text with the ledger.
 * `hashes` holds the hash per reachable URL. Findings: "source-unreachable" when a page cannot be
 * had, "ledger-hash-mismatch" when its text is not the text the ledger recorded.
 */
export async function fetchSources(
  units: LoadedUnit[],
  options: SourceCacheOptions,
): Promise<{ hashes: Record<string, string>; findings: Finding[] }> {
  const urls = ledgerUrls(units);
  const obtained = await mapConcurrently(urls, (url) => obtainSource(url, options));
  const hashes: Record<string, string> = {};
  const unreachableReasons = new Map<string, string>();
  obtained.forEach((result, index) => {
    if (result.source) hashes[urls[index]] = sha256(result.source.text);
    else unreachableReasons.set(urls[index], result.unreachable);
  });
  const findings: Finding[] = [];
  for (const unit of validUnitsOf(units)) {
    const report = reporterFor(findings, "PRECHECK", unit.unit);
    for (const { url, sha256: recordedHash } of unit.sources) {
      const reason = unreachableReasons.get(url);
      if (reason !== undefined) report("source-unreachable", `source ${url} cannot be fetched: ${reason}`);
      else if (hashes[url] !== recordedHash) {
        report("ledger-hash-mismatch", `the text of ${url} is not the text the ledger recorded; review the page and update the ledger`);
      }
    }
  }
  return { hashes, findings };
}

type RawLedgerEntry = { url: string; retrievedAt: string; sha256: string };

/**
 * The `--update-ledger` mode: downloads every ledger source again and rewrites `sha256` and
 * `retrievedAt` in the unit files (two-space JSON, trailing newline). Returns the sources that
 * could not be fetched; their ledger entries are left as they were.
 */
export async function updateLedgerHashes(
  units: LoadedUnit[],
  options: Omit<SourceCacheOptions, "offline" | "refresh"> & { retrievedAt?: string },
): Promise<Finding[]> {
  const { hashes, findings } = await fetchSources(units, { ...options, refresh: true });
  const retrievedAt = options.retrievedAt ?? new Date().toISOString().slice(0, 10);
  for (const loaded of units) {
    if (!loaded.unit || loaded.unit.sources.length === 0) continue;
    const raw = loaded.raw as { sources: RawLedgerEntry[] };
    for (const entry of raw.sources) {
      if (hashes[entry.url] !== undefined) Object.assign(entry, { retrievedAt, sha256: hashes[entry.url] });
    }
    writeFileSync(loaded.filePath, `${JSON.stringify(raw, null, 2)}\n`);
  }
  return findings.filter((finding) => finding.check === "source-unreachable");
}
