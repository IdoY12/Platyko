import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { sha256 } from "./sha256.js";
import { CONTENT_ROOT, constructsPath, tracesDirectory, unitsDirectory } from "./paths.js";

function withSortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withSortedKeys);
  if (typeof value !== "object" || value === null) return value;
  const entries = Object.entries(value).sort(([left], [right]) => (left < right ? -1 : 1));
  return Object.fromEntries(entries.map(([key, child]) => [key, withSortedKeys(child)]));
}

/** JSON reduced to its values: key order and whitespace do not matter. Text that is not JSON keeps its lines. */
function canonicalContent(text: string): string {
  try {
    return JSON.stringify(withSortedKeys(JSON.parse(text)));
  } catch {
    return text.replaceAll("\r\n", "\n");
  }
}

function jsonFilesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * Identity of the bank's content (PRD 8.5): sha256 over every unit file, every generated trace and
 * the construct map, each as `content/<path>` followed by its canonical JSON, in sorted path order.
 * The same content gives the same hash on every machine, wherever the repository is checked out.
 */
export function computeBankHash(contentRoot: string = CONTENT_ROOT): string {
  const files = [
    ...jsonFilesUnder(unitsDirectory(contentRoot)),
    ...jsonFilesUnder(tracesDirectory(contentRoot)),
    ...(existsSync(constructsPath(contentRoot)) ? [constructsPath(contentRoot)] : []),
  ];
  const parts = files
    .map((filePath) => ({
      path: ["content", ...relative(contentRoot, filePath).split(sep)].join("/"),
      content: canonicalContent(readFileSync(filePath, "utf8")),
    }))
    .sort((left, right) => (left.path < right.path ? -1 : 1));
  return sha256(parts.map(({ path, content }) => `${path}\n${content}\n`).join(""));
}
