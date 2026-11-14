import type { AuthoredItem, Track } from "./item.js";
import type { ItemTrace } from "./trace.js";

export type UnitConcept = { id: string; title: string; prerequisites: string[] };

export type UnitMisconception = { id: string; description: string };

/** Source ledger entry (PRD 9.3): the URL and a hash of the fetched text, never the text itself. */
export type UnitSource = { url: string; retrievedAt: string; sha256: string };

/** Ungraded opening card of a lesson: a short explanation and a worked example that is executed. */
export type ConceptCard = { title: string; body: string; code: string[]; expectedOutput: string };

export type UnitLesson = {
  /** `<unit>.lesson-N`. */
  id: string;
  title: string;
  conceptCard: ConceptCard;
  /** The unit's new items taught by this lesson, in PRIMM order. */
  itemIds: string[];
};

export const LESSONS_PER_UNIT = 4;
export const LESSON_SLOTS = 8;

/** Number of authored items in each unit of a track (PRD 7.5). */
export const ITEMS_PER_UNIT: Record<Track, number> = {
  BEGINNER: 24,
  INTERMEDIATE: 24,
  ADVANCED: 20,
  EXPERT: 16,
};

/** One file in `content/units/<track>/`. */
export type UnitFile = {
  track: Track;
  /** Slug, unique across the bank: "closures". */
  unit: string;
  /** 1-based position inside the track. */
  order: number;
  title: string;
  summary: string;
  concepts: UnitConcept[];
  misconceptions: UnitMisconception[];
  sources: UnitSource[];
  lessons: UnitLesson[];
  items: AuthoredItem[];
};

/** An item as loaded into the database and sent to a lesson: authored fields plus placement and trace. */
export type Item = AuthoredItem & { track: Track; unit: string; trace?: ItemTrace };
