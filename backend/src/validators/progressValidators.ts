import { z } from "zod";
import { MAX_ATTEMPTS_PER_BATCH, MAX_GUEST_ATTEMPTS } from "@project/api-contract";
import { ATTEMPT_CONTEXTS, DAILY_CHALLENGE_LENGTH, HINT_LEVELS } from "@project/learning-logic";
import { CALENDAR_DATE_PATTERN } from "@project/streak-logic";

const contentId = z.string().min(3).max(120).regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const calendarDate = z.string().regex(CALENDAR_DATE_PATTERN);

/** A learner can never submit a `MIGRATED` attempt: that context belongs to the legacy data migration. */
const submittableContexts = ATTEMPT_CONTEXTS.filter((context) => context !== "MIGRATED");

const attemptSchema = z.object({
  clientAttemptId: z.string().min(8).max(64).regex(/^[A-Za-z0-9-]+$/),
  itemId: contentId,
  itemVersion: z.number().int().min(1).max(10_000),
  correct: z.boolean(),
  attemptNo: z.number().int().min(1).max(4),
  optionIndex: z.number().int().min(0).max(5).nullable(),
  usedHint: z.number().int().min(0).max(HINT_LEVELS),
  context: z.enum(submittableContexts as [string, ...string[]]),
  lessonId: contentId.nullable(),
  answeredAt: z.iso.datetime(),
});

const completedLessonSchema = z.object({ lessonId: contentId, flawless: z.boolean(), accuracy: z.number().int().min(0).max(100) });

const dailyChallengeSchema = z.object({ date: calendarDate, grid: z.array(z.boolean()).min(1).max(DAILY_CHALLENGE_LENGTH) });

/** A month of daily challenges at most: what a guest's device keeps. */
const MAX_DAILY_CHALLENGES = 31;

const progressBatch = (maximumAttempts: number) =>
  z.object({
    clientLocalDate: calendarDate,
    attempts: z.array(attemptSchema).max(maximumAttempts),
    completedLessons: z.array(completedLessonSchema).max(200),
    dailyChallenges: z.array(dailyChallengeSchema).max(MAX_DAILY_CHALLENGES).default([]),
  });

export const submitProgressBodySchema = progressBatch(MAX_ATTEMPTS_PER_BATCH);
export const guestProgressSchema = progressBatch(MAX_GUEST_ATTEMPTS);

export const progressQuerySchema = z.object({ date: calendarDate.optional() });

/** The saved lesson is opaque to the server except for its size and its lesson id. */
export const saveResumeBodySchema = z.object({
  lessonId: contentId,
  session: z.object({
    lessonId: contentId,
    slots: z.array(z.union([z.object({ kind: z.literal("conceptCard") }), z.object({ kind: z.literal("item"), itemId: contentId, review: z.boolean() })])).max(40),
    position: z.number().int().min(0).max(40),
    items: z.record(
      contentId,
      z.object({
        attempts: z.number().int().min(0).max(4),
        firstVisit: z.enum(["correct", "retry", "reveal"]).nullable(),
        firstAttemptCorrect: z.boolean(),
        returned: z.boolean(),
      }),
    ),
  }),
});

export type SubmitProgressBody = z.infer<typeof submitProgressBodySchema>;
export type GuestProgressBody = z.infer<typeof guestProgressSchema>;
export type ProgressQuery = z.infer<typeof progressQuerySchema>;
export type SaveResumeBody = z.infer<typeof saveResumeBodySchema>;
