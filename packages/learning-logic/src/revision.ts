/**
 * Revision mode (PRD 5.1 L9): before an exam or an interview the learner picks units and a
 * length, and gets one mixed session from them, weakest concepts first. Its id carries the
 * choice, so the session needs no other state; the items come from `pickReviewItems`.
 */

export const REVISION_LENGTHS = [10, 20] as const;
const REVISION_PREFIX = "revision:";
const UNIT_SEPARATOR = "+";

export function revisionId(units: readonly string[], length: number): string {
  return `${REVISION_PREFIX}${length}:${units.join(UNIT_SEPARATOR)}`;
}

/** The units and length of a revision id, or null for any other lesson id. */
export function revisionChoice(lessonId: string): { units: string[]; length: number } | null {
  if (!lessonId.startsWith(REVISION_PREFIX)) return null;
  const [lengthText, unitList = ""] = lessonId.slice(REVISION_PREFIX.length).split(":");
  const length = Number(lengthText);
  const units = unitList.split(UNIT_SEPARATOR).filter(Boolean);
  return (REVISION_LENGTHS as readonly number[]).includes(length) && units.length > 0 ? { units, length } : null;
}
