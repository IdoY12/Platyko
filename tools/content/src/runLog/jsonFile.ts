import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Writes indented JSON, creating the folder when it does not exist yet. */
export function writeJsonFile(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/** The parsed file, or `undefined` when there is no such file. Throws when the file is not JSON. */
export function readJsonFile(filePath: string): unknown {
  if (!existsSync(filePath)) return undefined;
  const parsed: unknown = JSON.parse(readFileSync(filePath, "utf8"));
  return parsed;
}
