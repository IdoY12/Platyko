import config from "config";
import { prisma, type ItemStatus } from "@project/db";
import type { ContentMapResponse, LessonContentResponse } from "@project/api-contract";
import { TRACKS, type ConceptCard, type Item, type ItemTrace, type UnitConcept } from "@project/content-model";
import { summaryLessonId, type MapUnit } from "@project/learning-logic";

/** A lesson as the seed stores it on `ContentUnit.lessons`. */
type StoredLesson = { id: string; title: string; conceptCard: ConceptCard; itemIds: string[] };

const MAP_CACHE_MS = 30_000;
let cachedMap: { value: ContentMapResponse; expiresAt: number } | null = null;

/**
 * Items a learner may see. Only `LIVE` items are released by a clean verification run (PRD 8.1);
 * a development server may also serve drafts so that work in progress can be played.
 */
function servedStatuses(): ItemStatus[] {
  return config.get<boolean>("content.serveDrafts") ? ["LIVE", "DRAFT"] : ["LIVE"];
}

/** The skill map without item content: units in curriculum order, lessons with their item ids. */
export async function loadContentMap(): Promise<ContentMapResponse> {
  if (cachedMap && cachedMap.expiresAt > Date.now()) return cachedMap.value;
  const [bank, units, items] = await Promise.all([
    prisma.contentBank.findUnique({ where: { id: 1 } }),
    prisma.contentUnit.findMany(),
    prisma.item.findMany({ where: { status: { in: servedStatuses() } }, select: { id: true } }),
  ]);
  const servedItemIds = new Set(items.map((item) => item.id));
  const mapUnits: MapUnit[] = units
    .sort((left, right) => TRACKS.indexOf(left.track) - TRACKS.indexOf(right.track) || left.orderInTrack - right.orderInTrack)
    .map((unit) => {
      const concepts = unit.concepts as unknown as UnitConcept[];
      const lessons = unit.lessons as unknown as StoredLesson[];
      return {
        unit: unit.unit,
        track: unit.track,
        order: unit.orderInTrack,
        title: unit.title,
        summary: unit.summary,
        lessons: [
          ...lessons.map((lesson, index) => ({
            id: lesson.id,
            title: lesson.title,
            concept: concepts[index]?.id ?? null,
            itemIds: lesson.itemIds.filter((itemId) => servedItemIds.has(itemId)),
          })),
          { id: summaryLessonId(unit.unit), title: null, concept: null, itemIds: [] },
        ],
      };
    })
    // A unit whose items are all withheld (flagged, or drafts in production) is not offered.
    .filter((unit) => unit.lessons.some((lesson) => lesson.itemIds.length > 0));
  const value = { bankHash: bank?.bankHash ?? "", units: mapUnits };
  cachedMap = { value, expiresAt: Date.now() + MAP_CACHE_MS };
  return value;
}

export async function loadItems(itemIds: string[]): Promise<Item[]> {
  const rows = await prisma.item.findMany({ where: { id: { in: itemIds }, status: { in: servedStatuses() } }, orderBy: [{ unit: "asc" }, { orderInUnit: "asc" }] });
  return rows.map((row) => row.payload as unknown as Item);
}

/** One lesson: its concept card with the worked example's trace, and its items. Null when unknown. */
export async function loadLessonContent(lessonId: string): Promise<LessonContentResponse | null> {
  const unitSlug = lessonId.slice(0, lessonId.lastIndexOf("."));
  const unit = await prisma.contentUnit.findUnique({ where: { unit: unitSlug } });
  if (!unit) return null;
  if (lessonId === summaryLessonId(unitSlug)) {
    const rows = await prisma.item.findMany({ where: { unit: unitSlug, status: { in: servedStatuses() } }, orderBy: { orderInUnit: "asc" } });
    return { lessonId, unit: unitSlug, conceptCard: null, conceptCardTrace: null, items: rows.map((row) => row.payload as unknown as Item) };
  }
  const lesson = (unit.lessons as unknown as StoredLesson[]).find((candidate) => candidate.id === lessonId);
  if (!lesson) return null;
  const traces = unit.conceptCardTraces as unknown as Record<string, ItemTrace>;
  return {
    lessonId,
    unit: unitSlug,
    conceptCard: lesson.conceptCard,
    conceptCardTrace: traces[lessonId] ?? null,
    items: await loadItems(lesson.itemIds),
  };
}

/** Every lesson id of the loaded bank, summary lessons included. */
export async function knownLessonIds(): Promise<Set<string>> {
  const { units } = await loadContentMap();
  return new Set(units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id)));
}
