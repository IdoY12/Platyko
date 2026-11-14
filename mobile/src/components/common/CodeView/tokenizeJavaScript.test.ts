import { describe, expect, it } from "vitest";
import { tokenizeJavaScript, type CodeToken } from "./tokenizeJavaScript";

const kindsOf = (line: string) =>
  tokenizeJavaScript([line])[0]
    .filter((token) => token.text.trim() !== "")
    .map((token) => `${token.kind}:${token.text}`);

const rebuilt = (tokens: CodeToken[]) => tokens.map((token) => token.text).join("");

describe("tokenizeJavaScript", () => {
  it("classifies keywords, names, operators, numbers and punctuation", () => {
    expect(kindsOf("let count = 0;")).toEqual([
      "keyword:let", "plain:count", "operator:=", "number:0", "punctuation:;",
    ]);
  });

  it("marks called and declared functions, but not plain property reads", () => {
    expect(kindsOf("console.log(total)")).toContain("functionName:log");
    expect(kindsOf("function add(a, b) {")).toContain("functionName:add");
    expect(kindsOf("items.length")).toContain("plain:length");
  });

  it("does not treat a property named like a keyword as a keyword", () => {
    expect(kindsOf("promise.catch(handle)")).toContain("functionName:catch");
    expect(kindsOf("node.default")).toContain("plain:default");
  });

  it("reads strings with escaped quotes as one token", () => {
    expect(kindsOf(`const text = 'it\\'s';`)).toContain(`string:'it\\'s'`);
    expect(kindsOf(`log("a // b")`)).toContain(`string:"a // b"`);
  });

  it("splits a template literal into text and interpolated code", () => {
    expect(kindsOf("`Hi ${user.name}!`")).toEqual([
      "string:`", "string:Hi ", "punctuation:${", "plain:user", "punctuation:.", "plain:name", "punctuation:}", "string:!`",
    ]);
  });

  it("keeps object braces inside an interpolation from closing it", () => {
    const tokens = kindsOf("`${ {a: 1}.a } done`");
    expect(tokens[tokens.length - 1]).toBe("string: done`");
  });

  it("carries block comments and template literals across lines", () => {
    const [first, second, third] = tokenizeJavaScript(["/* start", "still */ let a = `x", "y`;"]);
    expect(first.every((token) => token.kind === "comment")).toBe(true);
    expect(second[0]).toEqual({ kind: "comment", text: "still */" });
    expect(third[0]).toEqual({ kind: "string", text: "y`" });
  });

  it("tells a regular expression from a division", () => {
    expect(kindsOf("const pattern = /a\\/b/g;")).toContain("string:/a\\/b/g");
    expect(kindsOf("const half = total / 2;")).toContain("operator:/");
  });

  it("reads numeric forms: decimals, exponents, hex, separators and bigint", () => {
    for (const literal of ["3.14", "1e3", "0xff", "1_000", "10n", ".5"]) {
      expect(kindsOf(`x = ${literal}`)).toContain(`number:${literal}`);
    }
  });

  it("prefers the longest operator", () => {
    expect(kindsOf("a === b")).toContain("operator:===");
    expect(kindsOf("(x) => x ?? y")).toEqual(expect.arrayContaining(["operator:=>", "operator:??"]));
    expect(kindsOf("[...items]")).toContain("operator:...");
  });

  it("returns tokens that concatenate back to the exact source line", () => {
    const lines = ["for (let i = 0; i < 3; i++) {", "  total += i; // add", "}", "const s = `a${b}c`;", "x = a / b / c;"];
    tokenizeJavaScript(lines).forEach((tokens, index) => expect(rebuilt(tokens)).toBe(lines[index]));
  });
});
