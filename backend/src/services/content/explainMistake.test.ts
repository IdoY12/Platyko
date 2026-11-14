import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@project/content-model";
import { explainMistake, isSafeExplanation } from "./explainMistake.js";

const provider = (name: string) => ({ baseUrl: `https://${name}.test/v1`, apiKey: "key", model: "model" });
const settings = { enabled: false, primary: provider("primary"), secondary: provider("secondary") };
vi.mock("config", () => ({ default: { get: () => settings } }));
const reply = (content: string) => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content } }] })));

const reference = ["const total = prices.reduce((sum, price) => sum + price, 0);", "return total;"];

describe("the check on an AI explanation", () => {
  it("accepts a short explanation that names the idea", () => {
    expect(isSafeExplanation("Your loop starts at 1, so the first price is never added. Think about where the sum begins.", reference)).toBe(true);
  });

  it("rejects a reply that contains the reference solution or a meaningful line of it, whatever the spacing", () => {
    expect(isSafeExplanation(`Try this: ${reference.join(" ")}`, reference)).toBe(false);
    expect(isSafeExplanation("Use   const total =  prices.reduce((sum, price) => sum + price, 0);  instead.", reference)).toBe(false);
  });

  it("rejects an empty reply and one over 80 words", () => {
    expect(isSafeExplanation("   ", reference)).toBe(false);
    expect(isSafeExplanation(Array.from({ length: 81 }, () => "word").join(" "), reference)).toBe(false);
  });
});

describe("explain my mistake", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    settings.enabled = false;
  });
  const item = { format: "CODE_WRITE", prompt: "Sum the prices.", solution: { reference } } as unknown as Item;

  it("asks no provider and returns null while the flag is off (the default)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await explainMistake(item, "return 0;", "en")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null for any format but CODE_WRITE", async () => {
    expect(await explainMistake({ ...item, format: "PREDICT_OUTPUT" } as Item, "x", "en")).toBeNull();
  });

  it("tries the next provider when one fails, and drops a reply that gives the solution away", async () => {
    settings.enabled = true;
    const fetchSpy = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockReturnValueOnce(reply("The loop never adds the first price."));
    vi.stubGlobal("fetch", fetchSpy);
    expect(await explainMistake(item, "return 0;", "he")).toBe("The loop never adds the first price.");
    expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual(["https://primary.test/v1/chat/completions", "https://secondary.test/v1/chat/completions"]);
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(reply(`Write ${reference[0]}`)));
    expect(await explainMistake(item, "return 0;", "en")).toBeNull();
  });
});
