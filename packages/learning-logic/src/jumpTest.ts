import { TRACKS, type Track } from "@project/content-model";
import type { MapUnit } from "./skillMap.js";
import type { ProgressSnapshot } from "./progress.js";

/**
 * The jump test (PRD 6.2): any track after the first can be entered by passing a test of ten
 * items drawn from the track before it; eight right at the first attempt open it, together with
 * every track before it. The selection and the pass rule are plain functions, so the app and the
 * server agree on both, and nothing here calls a model (PRD 15.9).
 */

export const JUMP_TEST_LENGTH = 10;
const JUMP_TEST_PASS_SHARE = 0.8;
const JUMP_TEST_PREFIX = "jump:";

/** The lesson-player id of a track's jump test. */
export function jumpTestId(track: Track): string {
  return `${JUMP_TEST_PREFIX}${track}`;
}

/** The track a jump-test id opens, or null for any other lesson id. */
export function jumpTestTrack(lessonId: string): Track | null {
  if (!lessonId.startsWith(JUMP_TEST_PREFIX)) return null;
  const track = lessonId.slice(JUMP_TEST_PREFIX.length);
  return (TRACKS as readonly string[]).includes(track) && track !== TRACKS[0] ? (track as Track) : null;
}

/**
 * The test's items: the first item of each teaching lesson of the previous track (a prediction
 * that stands on its own), taken unit by unit in turns so the test spans the whole track.
 */
export function jumpTestItemIds(map: readonly MapUnit[], track: Track): string[] {
  const previousTrack = TRACKS[TRACKS.indexOf(track) - 1];
  const units = map.filter((unit) => unit.track === previousTrack).sort((left, right) => left.order - right.order);
  const firstItems = units.map((unit) => unit.lessons.filter((lesson) => lesson.concept !== null).flatMap((lesson) => lesson.itemIds.slice(0, 1)));
  const picked: string[] = [];
  for (let round = 0; picked.length < JUMP_TEST_LENGTH && firstItems.some((items) => items.length > round); round += 1) {
    for (const items of firstItems) {
      if (picked.length < JUMP_TEST_LENGTH && items[round] !== undefined) picked.push(items[round]);
    }
  }
  return picked;
}

/** How many right answers a test of `length` items needs: eight of ten, scaled for a shorter one. */
export function jumpTestPassMark(length: number): number {
  return Math.ceil(length * JUMP_TEST_PASS_SHARE);
}

/** Whether `rightAtFirstAttempt` of a test of `length` items opens the track. */
export function isJumpTestPassed(rightAtFirstAttempt: number, length: number): boolean {
  return length > 0 && rightAtFirstAttempt >= jumpTestPassMark(length);
}

/** The snapshot after a passed test: the track and every track before it are open. */
export function withJumpedTrack(snapshot: ProgressSnapshot, track: Track): ProgressSnapshot {
  const opened = TRACKS.slice(1, TRACKS.indexOf(track) + 1);
  return { ...snapshot, jumpedTracks: [...new Set([...snapshot.jumpedTracks, ...opened])] };
}
