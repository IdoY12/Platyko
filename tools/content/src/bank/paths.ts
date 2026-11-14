import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Track } from "@project/content-model";

/** The repository's `content/` folder. Every function that reads the bank accepts another root for tests. */
export const CONTENT_ROOT = fileURLToPath(new URL("../../../../content", import.meta.url));

export function unitsDirectory(contentRoot: string): string {
  return join(contentRoot, "units");
}

export function tracesDirectory(contentRoot: string): string {
  return join(contentRoot, "generated", "traces");
}

export function constructsPath(contentRoot: string): string {
  return join(contentRoot, "constructs.json");
}

/** Fetched source text and link-check results live here and are never committed (PRD 9.3). */
export function defaultCacheDirectory(contentRoot: string): string {
  return join(contentRoot, ".cache");
}

/** Name of the folder under `content/units` that holds a track's unit files. */
export function trackFolder(track: Track): string {
  return track.toLowerCase();
}
