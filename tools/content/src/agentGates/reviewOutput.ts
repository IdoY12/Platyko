import { z } from "zod";
import { reporterFor } from "../bank/finding.js";
import type { Finding } from "../bank/finding.js";
import { describeIssues, gateCheck, readGateOutput } from "./gateFiles.js";
import type { AgentGate } from "./gateFiles.js";

/** What a clarity reviewer may report about an item or a concept card (PRD 8.3, Gate C). */
const CLARITY_CATEGORIES = [
  "ambiguous-prompt",
  "multiple-defensible-answers",
  "trick-wording",
  "outdated-or-engine-specific",
  "misleading-explanation",
  "inaccurate-option-feedback",
  "bad-hint",
  "other",
] as const;

/** What a difficulty and fit reviewer may report about an item (PRD 8.3, Gate D). */
const FIT_CATEGORIES = ["wrong-unit", "difficulty-mismatch", "undeclared-prerequisite", "recipe-mismatch", "other"] as const;

/** Each reported defect is validated on its own, so one malformed entry does not void the rest of the file. */
const reviewedSubjectSchema = z.object({ findings: z.array(z.unknown()) });
const itemReviewsSchema = z.array(reviewedSubjectSchema.extend({ id: z.string() }));
const clarityOutputSchema = z.object({
  unit: z.string(),
  reviews: itemReviewsSchema,
  conceptCards: z.array(reviewedSubjectSchema.extend({ lessonId: z.string() })),
});
const fitOutputSchema = z.object({ unit: z.string(), reviews: itemReviewsSchema });

type Review = { id: string; findings: unknown[] };
/** Something the reviewer must give a verdict on. A concept card is filed under its unit, not under an item. */
type ReviewSubject = { id: string; itemId: string | null };

type ReviewedUnit = { unit: string; itemIds: string[]; lessonIds: string[] };

/**
 * Turns the reviews of one gate into findings. Every subject needs an entry — an empty `findings`
 * list is the explicit clean verdict — and every reported defect becomes a finding named by its category.
 */
function collectReviewFindings(
  gate: AgentGate,
  unit: string,
  categories: readonly [string, ...string[]],
  subjects: ReviewSubject[],
  reviews: Review[],
  findings: Finding[],
): void {
  const defectSchema = z.object({ category: z.enum(categories), detail: z.string().trim().min(1) });
  for (const subject of subjects) {
    const report = reporterFor(findings, gate, unit, subject.itemId);
    const prefix = subject.itemId === null ? `${subject.id}: ` : "";
    const ownReviews = reviews.filter((review) => review.id === subject.id);
    if (ownReviews.length === 0) report(gateCheck(gate, "not-reviewed"), `${prefix}the reviewer's output has no entry for it`);
    for (const defect of ownReviews.flatMap((review) => review.findings)) {
      const parsed = defectSchema.safeParse(defect);
      if (parsed.success) report(parsed.data.category, `${prefix}${parsed.data.detail}`);
      else report(gateCheck(gate, "output-invalid"), `${prefix}a finding needs a category (${categories.join(", ")}) and a detail: ${describeIssues(parsed.error)}`);
    }
  }
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  for (const review of reviews) {
    if (!subjectIds.has(review.id)) reporterFor(findings, gate, unit)(gateCheck(gate, "output-invalid"), `the reviewer reviewed "${review.id}", which is not in this unit`);
  }
}

const itemSubjects = (itemIds: string[]): ReviewSubject[] => itemIds.map((id) => ({ id, itemId: id }));

/** Gate C: the clarity reviewer's verdict on every item and every concept card of the unit. */
export function ingestClarityReview(passDirectory: string, { unit, itemIds, lessonIds }: ReviewedUnit, findings: Finding[]): void {
  const output = readGateOutput(passDirectory, "C", unit, clarityOutputSchema, findings);
  const cardReviews = output?.conceptCards.map(({ lessonId, findings: defects }) => ({ id: lessonId, findings: defects })) ?? [];
  const subjects = [...itemSubjects(itemIds), ...lessonIds.map((id) => ({ id, itemId: null }))];
  collectReviewFindings("C", unit, CLARITY_CATEGORIES, subjects, [...(output?.reviews ?? []), ...cardReviews], findings);
}

/** Gate D: the difficulty and fit reviewer's verdict on every item of the unit. */
export function ingestFitReview(passDirectory: string, { unit, itemIds }: ReviewedUnit, findings: Finding[]): void {
  const output = readGateOutput(passDirectory, "D", unit, fitOutputSchema, findings);
  collectReviewFindings("D", unit, FIT_CATEGORIES, itemSubjects(itemIds), output?.reviews ?? [], findings);
}
