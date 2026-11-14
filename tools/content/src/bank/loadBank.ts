import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { TRACKS } from "@project/content-model";
import type { Item, UnitFile } from "@project/content-model";
import { unitFileSchema } from "../schema/unitFileSchema.js";
import { CONTENT_ROOT, trackFolder, unitsDirectory } from "./paths.js";

export type LoadedUnit = {
  filePath: string;
  /** The parsed JSON, whatever its shape. */
  raw: unknown;
  /** Null when the file does not match the unit schema; the structural pre-check says why. */
  unit: UnitFile | null;
  /** Set only when the file is not JSON at all. */
  jsonError?: string;
};

/** `<two-digit order>-<unit slug>.json`. */
export const UNIT_FILE_NAME_PATTERN = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

function readUnitFile(filePath: string): LoadedUnit {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    return { filePath, raw: undefined, unit: null, jsonError: error instanceof Error ? error.message : String(error) };
  }
  const parsed = unitFileSchema.safeParse(raw);
  return { filePath, raw, unit: parsed.success ? parsed.data : null };
}

/** Name of the track folder a unit file sits in. */
export function folderOf(loaded: LoadedUnit): string {
  return basename(dirname(loaded.filePath));
}

/** The unit slug a finding is filed under: the declared one, or the file name when the file is invalid. */
export function unitSlugOf(loaded: LoadedUnit): string {
  const fileName = basename(loaded.filePath);
  return loaded.unit?.unit ?? UNIT_FILE_NAME_PATTERN.exec(fileName)?.[2] ?? fileName;
}

/** Sort key: track, then order. An invalid file is placed by its folder and file name. */
function bankPosition(loaded: LoadedUnit): [number, number] {
  const folderIndex = TRACKS.findIndex((track) => trackFolder(track) === folderOf(loaded));
  const trackIndex = loaded.unit ? TRACKS.indexOf(loaded.unit.track) : folderIndex === -1 ? TRACKS.length : folderIndex;
  const order = loaded.unit?.order ?? Number(UNIT_FILE_NAME_PATTERN.exec(basename(loaded.filePath))?.[1] ?? Infinity);
  return [trackIndex, order];
}

/**
 * Reads every `units/<track folder>/*.json`. Never throws for bad content. Units come in bank
 * order: track `BEGINNER` to `EXPERT`, then the unit's `order`.
 */
export function loadBank(contentRoot: string = CONTENT_ROOT): { units: LoadedUnit[] } {
  const root = unitsDirectory(contentRoot);
  const folders = existsSync(root) ? readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()) : [];
  const units = folders.flatMap((folder) =>
    readdirSync(join(root, folder.name))
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => readUnitFile(join(root, folder.name, fileName))),
  );
  const positioned = units.map((loaded) => ({ loaded, position: bankPosition(loaded) }));
  positioned.sort(
    (left, right) =>
      left.position[0] - right.position[0] ||
      left.position[1] - right.position[1] ||
      (left.loaded.filePath < right.loaded.filePath ? -1 : 1),
  );
  return { units: positioned.map(({ loaded }) => loaded) };
}

/** Every item in service, in bank order, with its track and unit attached. Retired items are left out. */
export function allItems(units: LoadedUnit[]): Item[] {
  return units.flatMap(({ unit }) =>
    unit ? unit.items.filter((item) => !item.retired).map((item) => ({ ...item, track: unit.track, unit: unit.unit })) : [],
  );
}
