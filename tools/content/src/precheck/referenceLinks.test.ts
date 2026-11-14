import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Item } from "@project/content-model";
import { allItems, loadBank } from "../bank/loadBank.js";
import type { FetchFunction } from "../bank/network.js";
import { FIXTURE_CONTENT_ROOT } from "../fixtures/fixtureUnit.js";
import { checkReferenceLinks } from "./referenceLinks.js";

const fixtureItems = allItems(loadBank(FIXTURE_CONTENT_ROOT).units);
const temporaryFolder = () => mkdtempSync(join(tmpdir(), "content-tools-links-"));

/** A fetch that answers every URL with `statusOf(url)` and records the requests. */
function fakeFetch(statusOf: (url: string) => number = () => 200): { fetchFunction: FetchFunction; requests: RequestInit[]; urls: string[] } {
  const requests: RequestInit[] = [];
  const urls: string[] = [];
  const fetchFunction: FetchFunction = async (url, init) => {
    urls.push(url);
    requests.push(init);
    return new Response("", { status: statusOf(url) });
  };
  return { fetchFunction, requests, urls };
}

function itemWithUrl(id: string, url: string): Item {
  return { ...fixtureItems[0], id, reference: { ...fixtureItems[0].reference, url } };
}

describe("checkReferenceLinks", () => {
  it("requests every distinct URL once, following redirects, and passes when all answer 200", async () => {
    const items = [...fixtureItems, itemWithUrl("again", fixtureItems[0].reference.url)];
    const { fetchFunction, requests, urls } = fakeFetch();
    expect(await checkReferenceLinks(items, { cacheDir: temporaryFolder(), fetchFunction })).toEqual({ findings: [], skipped: false });
    expect([...urls].sort()).toEqual([...new Set(fixtureItems.map((item) => item.reference.url))].sort());
    expect(requests[0].redirect).toBe("follow");
    expect(requests[0].signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(requests[0].headers).get("User-Agent")).toBe("platyko-content-tools");
  });

  it("reports anything but a 200 on every item that uses the URL", async () => {
    const broken = "https://developer.mozilla.org/en-US/docs/gone";
    const items = [itemWithUrl("a", broken), itemWithUrl("b", "https://developer.mozilla.org/en-US/docs/fine"), itemWithUrl("c", broken)];
    const { fetchFunction } = fakeFetch((url) => (url === broken ? 404 : 200));
    const { findings } = await checkReferenceLinks(items, { cacheDir: temporaryFolder(), fetchFunction });
    expect(findings).toEqual(
      ["a", "c"].map((itemId) => ({
        gate: "PRECHECK",
        check: "reference-link-broken",
        itemId,
        unit: "fixture-unit",
        message: `reference ${broken} does not return 200: the server answered 404`,
      })),
    );
  });

  it("reports a network failure or a timeout", async () => {
    const fetchFunction: FetchFunction = async () => {
      throw new Error("The operation was aborted due to timeout");
    };
    const { findings } = await checkReferenceLinks([fixtureItems[0]], { cacheDir: temporaryFolder(), fetchFunction });
    expect(findings.map((finding) => finding.message)).toEqual([
      `reference ${fixtureItems[0].reference.url} does not return 200: The operation was aborted due to timeout`,
    ]);
  });

  it("does not request a link again within 24 hours of a successful check", async () => {
    const cacheDir = temporaryFolder();
    const first = fakeFetch();
    await checkReferenceLinks(fixtureItems, { cacheDir, fetchFunction: first.fetchFunction });
    const second = fakeFetch(() => 500);
    expect(await checkReferenceLinks(fixtureItems, { cacheDir, fetchFunction: second.fetchFunction })).toEqual({ findings: [], skipped: false });
    expect(second.urls).toEqual([]);
  });

  it("checks again after 24 hours, and never caches a failure", async () => {
    const cacheDir = temporaryFolder();
    const [item] = fixtureItems;
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    writeFileSync(join(cacheDir, "reference-links.json"), JSON.stringify({ [item.reference.url]: yesterday }));
    const failing = fakeFetch(() => 503);
    expect((await checkReferenceLinks([item], { cacheDir, fetchFunction: failing.fetchFunction })).findings).toHaveLength(1);
    expect(failing.urls).toEqual([item.reference.url]);
    const again = fakeFetch(() => 503);
    expect((await checkReferenceLinks([item], { cacheDir, fetchFunction: again.fetchFunction })).findings).toHaveLength(1);
    expect(again.urls).toEqual([item.reference.url]);
  });

  it("survives a damaged cache file", async () => {
    const cacheDir = temporaryFolder();
    writeFileSync(join(cacheDir, "reference-links.json"), "{ not json");
    const { fetchFunction, urls } = fakeFetch();
    expect((await checkReferenceLinks([fixtureItems[0]], { cacheDir, fetchFunction })).findings).toEqual([]);
    expect(urls).toHaveLength(1);
    expect(Object.keys(JSON.parse(readFileSync(join(cacheDir, "reference-links.json"), "utf8")) as object)).toEqual(urls);
  });

  it("offline: skips the network and says so without a finding", async () => {
    const { fetchFunction, urls } = fakeFetch(() => 404);
    expect(await checkReferenceLinks(fixtureItems, { cacheDir: temporaryFolder(), offline: true, fetchFunction })).toEqual({ findings: [], skipped: true });
    expect(urls).toEqual([]);
  });
});
