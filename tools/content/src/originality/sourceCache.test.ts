import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { UnitFile, UnitSource } from "@project/content-model";
import { loadBank } from "../bank/loadBank.js";
import type { LoadedUnit } from "../bank/loadBank.js";
import type { FetchFunction } from "../bank/network.js";
import { sha256 } from "../bank/sha256.js";
import { FIXTURE_CONTENT_ROOT, loadFixtureUnit } from "../fixtures/fixtureUnit.js";
import { fetchSources, readCachedSource, updateLedgerHashes } from "./sourceCache.js";

const PAGE_URL = "https://sources.example/pond-notes";
const OTHER_URL = "https://sources.example/other-page";
const PAGE_HTML = readFileSync(new URL("./fixtures/made-up-source.html", import.meta.url), "utf8");
const UNRECORDED_HASH = "0".repeat(64);

const temporaryFolder = () => mkdtempSync(join(tmpdir(), "content-tools-sources-"));

function unitWithSources(...sources: UnitSource[]): LoadedUnit {
  const unit: UnitFile = { ...loadFixtureUnit(), sources };
  return { filePath: "units/beginner/09-fixture-unit.json", raw: unit, unit };
}

const ledgerEntry = (url: string, hash = UNRECORDED_HASH): UnitSource => ({ url, retrievedAt: "2026-01-01", sha256: hash });

/** A fetch that serves `pages` by URL, answers 404 for anything else and records what it was asked. */
function fakeFetch(pages: Record<string, string>): { fetchFunction: FetchFunction; requests: { url: string; userAgent: string | null }[] } {
  const requests: { url: string; userAgent: string | null }[] = [];
  const fetchFunction: FetchFunction = async (url, init) => {
    requests.push({ url, userAgent: new Headers(init.headers).get("User-Agent") });
    return url in pages ? new Response(pages[url], { status: 200 }) : new Response("missing", { status: 404 });
  };
  return { fetchFunction, requests };
}

describe("fetchSources", () => {
  it("caches the page as text and code blocks and returns the hash of the text", async () => {
    const cacheDir = temporaryFolder();
    const { fetchFunction, requests } = fakeFetch({ [PAGE_URL]: PAGE_HTML });
    const { hashes } = await fetchSources([unitWithSources(ledgerEntry(PAGE_URL))], { cacheDir, fetchFunction });
    const cached = readCachedSource(cacheDir, PAGE_URL);

    expect(requests).toEqual([{ url: PAGE_URL, userAgent: "platyko-content-tools" }]);
    expect(readdirSync(join(cacheDir, "sources")).sort()).toEqual([`${sha256(PAGE_URL)}.code.json`, `${sha256(PAGE_URL)}.txt`]);
    expect(hashes).toEqual({ [PAGE_URL]: sha256(cached?.text ?? "") });
    expect(cached?.text.startsWith("Pond Notes: lists, loops and helpers Pond Notes: lists, loops & helpers A list keeps")).toBe(true);
    expect(cached?.text).not.toMatch(/<[a-z/!]|tracker|font-family|invented for the content-tools tests|\s{2}/);
    expect(cached?.codeBlocks).toHaveLength(4);
    expect(cached?.codeBlocks[0].split("\n").slice(0, 3)).toEqual([
      'const shelf = ["tea", "rice", "salt", "oats"];',
      "let longest = shelf[0];",
      "for (let slot = 1; slot < shelf.length; slot++) {",
    ]);
    expect(cached?.codeBlocks[3]).toBe("return");
  });

  it("decodes numeric entities and reads fenced code in plain text", async () => {
    const cacheDir = temporaryFolder();
    const text = "Caf&#233; &#x41;&amp;B &unknown; &constructor;\n```js\nlet a = 1;\n```\n";
    await fetchSources([unitWithSources(ledgerEntry(PAGE_URL))], { cacheDir, ...fakeFetch({ [PAGE_URL]: text }) });
    expect(readCachedSource(cacheDir, PAGE_URL)).toEqual({ text: "Café A&B &unknown; &constructor; ```js let a = 1; ```", codeBlocks: ["let a = 1;"] });
  });

  it("passes when the ledger records the hash of the page text, and reports a mismatch otherwise", async () => {
    const cacheDir = temporaryFolder();
    const fetchOptions = { cacheDir, ...fakeFetch({ [PAGE_URL]: PAGE_HTML }) };
    const first = await fetchSources([unitWithSources(ledgerEntry(PAGE_URL))], fetchOptions);
    expect(first.findings).toMatchObject([{ gate: "PRECHECK", check: "ledger-hash-mismatch", itemId: null, unit: "fixture-unit" }]);
    const second = await fetchSources([unitWithSources(ledgerEntry(PAGE_URL, first.hashes[PAGE_URL]))], fetchOptions);
    expect(second.findings).toEqual([]);
  });

  it("downloads a cached page again only when asked to refresh", async () => {
    const cacheDir = temporaryFolder();
    const units = [unitWithSources(ledgerEntry(PAGE_URL))];
    const { fetchFunction, requests } = fakeFetch({ [PAGE_URL]: PAGE_HTML });
    await fetchSources(units, { cacheDir, fetchFunction });
    await fetchSources(units, { cacheDir, fetchFunction });
    expect(requests).toHaveLength(1);
    await fetchSources(units, { cacheDir, fetchFunction, refresh: true });
    expect(requests).toHaveLength(2);
  });

  it("fetches a URL listed by several units once and reports it on each of them", async () => {
    const second: LoadedUnit = unitWithSources(ledgerEntry(OTHER_URL));
    if (second.unit) second.unit.unit = "second-unit";
    const { fetchFunction, requests } = fakeFetch({});
    const { hashes, findings } = await fetchSources([unitWithSources(ledgerEntry(OTHER_URL)), second], { cacheDir: temporaryFolder(), fetchFunction });
    expect(requests).toHaveLength(1);
    expect(hashes).toEqual({});
    expect(findings.map((finding) => [finding.check, finding.unit, finding.message])).toEqual([
      ["source-unreachable", "fixture-unit", `source ${OTHER_URL} cannot be fetched: the server answered 404`],
      ["source-unreachable", "second-unit", `source ${OTHER_URL} cannot be fetched: the server answered 404`],
    ]);
  });

  it("reports a network failure and writes nothing", async () => {
    const cacheDir = temporaryFolder();
    const fetchFunction: FetchFunction = async () => {
      throw new Error("getaddrinfo ENOTFOUND sources.example");
    };
    const { findings } = await fetchSources([unitWithSources(ledgerEntry(PAGE_URL))], { cacheDir, fetchFunction });
    expect(findings.map((finding) => finding.message)).toEqual([`source ${PAGE_URL} cannot be fetched: getaddrinfo ENOTFOUND sources.example`]);
    expect(existsSync(join(cacheDir, "sources"))).toBe(false);
  });

  it("offline: uses the cache and never calls the network", async () => {
    const cacheDir = temporaryFolder();
    const units = [unitWithSources(ledgerEntry(PAGE_URL), ledgerEntry(OTHER_URL))];
    await fetchSources(units, { cacheDir, ...fakeFetch({ [PAGE_URL]: PAGE_HTML }) });
    const { fetchFunction, requests } = fakeFetch({});
    const { hashes, findings } = await fetchSources(units, { cacheDir, fetchFunction, offline: true });
    expect(requests).toEqual([]);
    expect(Object.keys(hashes)).toEqual([PAGE_URL]);
    expect(findings.map((finding) => finding.check)).toEqual(["ledger-hash-mismatch", "source-unreachable"]);
    expect(findings[1].message).toContain("not in the cache and the run is offline");
  });

  it("has nothing to do for units without sources or without a valid file", async () => {
    const { fetchFunction, requests } = fakeFetch({});
    const invalid: LoadedUnit = { filePath: "bad.json", raw: {}, unit: null };
    expect(await fetchSources([unitWithSources(), invalid], { cacheDir: temporaryFolder(), fetchFunction })).toEqual({ hashes: {}, findings: [] });
    expect(requests).toEqual([]);
  });
});

describe("updateLedgerHashes", () => {
  /** A copy of the fixture bank on disk whose unit lists `sources`, in the fixture's own compact formatting. */
  function bankOnDisk(sources: UnitSource[]): { contentRoot: string; unitPath: string } {
    const contentRoot = temporaryFolder();
    cpSync(FIXTURE_CONTENT_ROOT, contentRoot, { recursive: true });
    const unitPath = join(contentRoot, "units", "beginner", "09-fixture-unit.json");
    writeFileSync(unitPath, readFileSync(unitPath, "utf8").replace('"sources": []', `"sources": ${JSON.stringify(sources)}`));
    return { contentRoot, unitPath };
  }

  it("rewrites sha256 and retrievedAt of every reachable source and keeps the rest of the file", async () => {
    const { contentRoot, unitPath } = bankOnDisk([ledgerEntry(PAGE_URL), ledgerEntry(OTHER_URL, "f".repeat(64))]);
    const cacheDir = temporaryFolder();
    const before = JSON.parse(readFileSync(unitPath, "utf8")) as UnitFile;
    const findings = await updateLedgerHashes(loadBank(contentRoot).units, {
      cacheDir,
      retrievedAt: "2026-11-14",
      ...fakeFetch({ [PAGE_URL]: PAGE_HTML }),
    });

    const text = readFileSync(unitPath, "utf8");
    const after = JSON.parse(text) as UnitFile;
    expect(findings.map((finding) => finding.check)).toEqual(["source-unreachable"]);
    expect(after.sources).toEqual([
      { url: PAGE_URL, retrievedAt: "2026-11-14", sha256: sha256(readCachedSource(cacheDir, PAGE_URL)?.text ?? "") },
      ledgerEntry(OTHER_URL, "f".repeat(64)),
    ]);
    expect({ ...after, sources: [] }).toEqual({ ...before, sources: [] });
    expect(Object.keys(after)).toEqual(Object.keys(before));
    expect(text).toBe(`${JSON.stringify(after, null, 2)}\n`);

    const afterUpdate = await fetchSources(loadBank(contentRoot).units, { cacheDir, offline: true });
    expect(afterUpdate.findings.map((finding) => finding.check)).toEqual(["source-unreachable"]);
  });

  it("downloads again even when the page is cached, and leaves units without sources untouched", async () => {
    const withSource = bankOnDisk([ledgerEntry(PAGE_URL)]);
    const cacheDir = temporaryFolder();
    await fetchSources(loadBank(withSource.contentRoot).units, { cacheDir, ...fakeFetch({ [PAGE_URL]: "<p>The old text of the page.</p>" }) });
    await updateLedgerHashes(loadBank(withSource.contentRoot).units, { cacheDir, ...fakeFetch({ [PAGE_URL]: "<p>The new text of the page.</p>" }) });
    const [{ unit }] = loadBank(withSource.contentRoot).units;
    expect(unit?.sources[0].sha256).toBe(sha256("The new text of the page."));
    expect(unit?.sources[0].retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const withoutSources = bankOnDisk([]);
    const textBefore = readFileSync(withoutSources.unitPath, "utf8");
    await updateLedgerHashes(loadBank(withoutSources.contentRoot).units, { cacheDir, ...fakeFetch({}) });
    expect(readFileSync(withoutSources.unitPath, "utf8")).toBe(textBefore);
  });
});
