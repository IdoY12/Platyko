import type { Track } from "@project/content-model";
import { TRACKS } from "@project/content-model";
import { isMastered } from "./mastery.js";

/**
 * The skill map (PRD 6.2): track, unit, lesson. Every lesson shows one of five states, units
 * unlock in order inside a track, and a jump test can open a later track directly.
 */

export type MapLesson = {
  id: string;
  /** The lesson's own title; null for the summary lesson, whose title is interface text. */
  title: string | null;
  /** The concept the lesson teaches; null for the unit's summary lesson. */
  concept: string | null;
  /** The lesson's new items. The summary lesson has none: its items are drawn when it starts. */
  itemIds: string[];
};

export type MapUnit = {
  unit: string;
  track: Track;
  /** 1-based position inside the track. */
  order: number;
  title: string;
  summary: string;
  /** The four teaching lessons followed by the summary lesson. */
  lessons: MapLesson[];
};

export const LESSON_STATES = ["locked", "available", "inProgress", "completed", "mastered"] as const;
export type LessonState = (typeof LESSON_STATES)[number];

export type LearnerProgress = {
  completedLessonIds: ReadonlySet<string>;
  /** The lesson left half-way, if any. */
  inProgressLessonId: string | null;
  /** 0 to 100 per concept id. */
  masteryByConcept: Readonly<Record<string, number>>;
  /** Tracks opened by a passed jump test. The first track is always open. */
  jumpedTracks: ReadonlySet<Track>;
};

/** Id of a unit's summary lesson. */
export function summaryLessonId(unit: string): string {
  return `${unit}.summary`;
}

function isUnitCompleted(unit: MapUnit, progress: LearnerProgress): boolean {
  return unit.lessons.every((lesson) => progress.completedLessonIds.has(lesson.id));
}

function unitsOfTrack(map: readonly MapUnit[], track: Track): MapUnit[] {
  return map.filter((unit) => unit.track === track).sort((left, right) => left.order - right.order);
}

/** A track is open when it is the first, was jumped into, or the track before it is finished. */
export function isTrackUnlocked(map: readonly MapUnit[], track: Track, progress: LearnerProgress): boolean {
  const index = TRACKS.indexOf(track);
  if (index === 0 || progress.jumpedTracks.has(track)) return true;
  const previous = unitsOfTrack(map, TRACKS[index - 1]);
  return previous.length > 0 && previous.every((unit) => isUnitCompleted(unit, progress));
}

/** A unit is open when its track is open and the unit before it in the track is completed. */
export function isUnitUnlocked(map: readonly MapUnit[], unit: MapUnit, progress: LearnerProgress): boolean {
  if (!isTrackUnlocked(map, unit.track, progress)) return false;
  const previous = unitsOfTrack(map, unit.track).find((candidate) => candidate.order === unit.order - 1);
  return previous === undefined || isUnitCompleted(previous, progress);
}

function isLessonMastered(unit: MapUnit, lesson: MapLesson, progress: LearnerProgress): boolean {
  const concepts = lesson.concept === null ? unit.lessons.flatMap((other) => (other.concept === null ? [] : [other.concept])) : [lesson.concept];
  return concepts.length > 0 && concepts.every((concept) => isMastered(progress.masteryByConcept[concept] ?? 0));
}

/** The state of every lesson of a unit, in lesson order. Lessons open one after another. */
export function lessonStatesOf(map: readonly MapUnit[], unit: MapUnit, progress: LearnerProgress): LessonState[] {
  const unitUnlocked = isUnitUnlocked(map, unit, progress);
  return unit.lessons.map((lesson, index) => {
    if (progress.completedLessonIds.has(lesson.id)) return isLessonMastered(unit, lesson, progress) ? "mastered" : "completed";
    if (progress.inProgressLessonId === lesson.id) return "inProgress";
    const previousDone = index === 0 || progress.completedLessonIds.has(unit.lessons[index - 1].id);
    return unitUnlocked && previousDone ? "available" : "locked";
  });
}

/**
 * The lesson "Continue" opens (PRD 16.3): the one left half-way, otherwise the first lesson in
 * map order that is open and not completed. Null when everything open is done.
 */
export function nextLessonId(map: readonly MapUnit[], progress: LearnerProgress): string | null {
  if (progress.inProgressLessonId !== null) return progress.inProgressLessonId;
  for (const track of TRACKS) {
    for (const unit of unitsOfTrack(map, track)) {
      const states = lessonStatesOf(map, unit, progress);
      const open = unit.lessons.find((_lesson, index) => states[index] === "available");
      if (open) return open.id;
    }
  }
  return null;
}

/** Share of a track's lessons that are completed, 0 to 1, for the profile's track bars. */
export function trackCompletion(map: readonly MapUnit[], track: Track, progress: LearnerProgress): number {
  const lessons = unitsOfTrack(map, track).flatMap((unit) => unit.lessons);
  if (lessons.length === 0) return 0;
  return lessons.filter((lesson) => progress.completedLessonIds.has(lesson.id)).length / lessons.length;
}
