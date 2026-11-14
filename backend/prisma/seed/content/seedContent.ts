/**
 * Loads the question bank from `content/` into the database (PRD 7.4, 8.6).
 *
 * Items become `LIVE` only when the bank is releasable: the latest verification run is the third
 * consecutive clean full pass and its hash equals the hash of the files being loaded. Otherwise
 * every item is loaded as `DRAFT`, which production never serves. An item is never deleted: one
 * that left the files is retired, so answer history always resolves.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ItemStatus, Prisma } from "@prisma/client";
import type { Item, ItemProvenance } from "@project/content-model";
import { computeBankHash, CONTENT_ROOT, loadBank, releaseStatus, tracesDirectory, type RunLog, type UnitTraces } from "@project/content-tools";

const EMPTY_TRACES: Omit<UnitTraces, "unit"> = { items: {}, conceptCards: {} };

function readJson<Shape>(path: string): Shape | null {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Shape) : null;
}

export async function seedContent(prisma: Prisma.TransactionClient): Promise<void> {
  const release = releaseStatus(CONTENT_ROOT);
  const releaseRun = release.releasable && release.runId ? readJson<RunLog>(join(CONTENT_ROOT, "verification", "runs", `${release.runId}.json`)) : null;
  const flagged = new Map((await prisma.item.findMany({ where: { status: "FLAGGED" }, select: { id: true, version: true } })).map((item) => [item.id, item.version]));
  const loadedItemIds: string[] = [];

  for (const { unit } of loadBank(CONTENT_ROOT).units) {
    if (!unit) throw new Error("A unit file does not match the schema; run `npm run content:verify` before seeding.");
    const traces = readJson<UnitTraces>(join(tracesDirectory(CONTENT_ROOT), `${unit.unit}.json`)) ?? EMPTY_TRACES;
    const unitRow = {
      track: unit.track,
      orderInTrack: unit.order,
      title: unit.title,
      summary: unit.summary,
      concepts: unit.concepts,
      lessons: unit.lessons,
      conceptCardTraces: traces.conceptCards,
    };
    await prisma.contentUnit.upsert({ where: { unit: unit.unit }, create: { unit: unit.unit, ...unitRow }, update: unitRow });

    for (const [orderInUnit, authored] of unit.items.entries()) {
      const payload: Item = { ...authored, track: unit.track, unit: unit.unit, trace: traces.items[authored.id] };
      const originality = releaseRun?.originality[authored.id];
      const provenance: Partial<ItemProvenance> = {
        author: authored.author,
        version: authored.version,
        ...(releaseRun && originality ? { originality, verificationRunId: releaseRun.runId } : {}),
      };
      // A flagged item returns to service only as a new version released by a new clean run (PRD 7.6).
      const staysFlagged = flagged.get(authored.id) === authored.version;
      const status: ItemStatus = authored.retired ? "RETIRED" : staysFlagged ? "FLAGGED" : releaseRun ? "LIVE" : "DRAFT";
      const itemRow = {
        track: unit.track,
        unit: unit.unit,
        concept: authored.concept,
        lessonId: unit.lessons.find((lesson) => lesson.itemIds.includes(authored.id))?.id ?? null,
        format: authored.format,
        variant: authored.variant ?? null,
        difficulty: authored.difficulty,
        payload: payload as unknown as Prisma.InputJsonValue,
        provenance: provenance as Prisma.InputJsonValue,
        duelEligible: authored.duelEligible,
        timeLimitSec: authored.timeLimitSec ?? null,
        status,
        version: authored.version,
        orderInUnit,
      };
      await prisma.item.upsert({ where: { id: authored.id }, create: { id: authored.id, ...itemRow }, update: itemRow });
      loadedItemIds.push(authored.id);
    }
  }

  await prisma.item.updateMany({ where: { id: { notIn: loadedItemIds } }, data: { status: "RETIRED" } });
  const bank = { bankHash: computeBankHash(CONTENT_ROOT), verificationRunId: releaseRun?.runId ?? null, loadedAt: new Date() };
  await prisma.contentBank.upsert({ where: { id: 1 }, create: { id: 1, ...bank }, update: bank });
  console.log(
    releaseRun
      ? `Content: ${loadedItemIds.length} items loaded as LIVE from verification run ${releaseRun.runId}.`
      : `Content: ${loadedItemIds.length} items loaded as DRAFT — the bank is not releasable (${release.reason}).`,
  );
}
