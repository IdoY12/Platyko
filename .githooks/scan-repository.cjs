#!/usr/bin/env node
// Language rule (CLAUDE.md rule 9), repository-wide: every tracked file is scanned for Hebrew
// characters; only the Hebrew UI locale file(s) under a `locales` folder may contain them.
// The pre-commit hook checks what is being committed; this scan proves the whole tree in CI.
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { HEBREW_CHARACTERS, findFirstHebrewLineNumber } = require("./hebrew-characters.cjs");

const HEBREW_LOCALE_PATH = /(^|\/)locales\/he(\.[^/]+|\/.+)$/;

const trackedPaths = execFileSync("git", ["ls-files", "-z"], { maxBuffer: 64 * 1024 * 1024 })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const isBinary = (content) => content.subarray(0, 8000).includes(0);

const violations = [];
for (const trackedPath of trackedPaths) {
  if (HEBREW_LOCALE_PATH.test(trackedPath)) continue;
  if (HEBREW_CHARACTERS.test(trackedPath)) {
    violations.push(`${trackedPath} (file name)`);
    continue;
  }
  let content;
  try {
    content = readFileSync(trackedPath);
  } catch {
    continue; // deleted in the working tree
  }
  if (isBinary(content)) continue;
  const lineNumber = findFirstHebrewLineNumber(content.toString("utf8"));
  if (lineNumber !== null) violations.push(`${trackedPath}:${lineNumber}`);
}

if (violations.length > 0) {
  console.error("Hebrew characters are allowed only in the Hebrew UI locale file (locales/he). Found in:");
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}
console.log(`No Hebrew outside the locale file (${trackedPaths.length} tracked files scanned).`);
