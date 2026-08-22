import { z } from "zod";
import {
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
  PASSWORD_TOO_LONG,
  PASSWORD_TOO_SHORT,
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
  USERNAME_TOO_LONG,
  USERNAME_TOO_SHORT,
} from "@project/user-credentials";

export const patchProfileBodySchema = z.object({
  username: z
    .string()
    .min(USERNAME_MIN_LEN, { message: USERNAME_TOO_SHORT })
    .max(USERNAME_MAX_LEN, { message: USERNAME_TOO_LONG })
    .optional(),
});

export const postChangePasswordBodySchema = z.object({
  currentPassword: z
    .string()
    .min(PASSWORD_MIN_LEN, { message: PASSWORD_TOO_SHORT })
    .max(PASSWORD_MAX_LEN, { message: PASSWORD_TOO_LONG }),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LEN, { message: PASSWORD_TOO_SHORT })
    .max(PASSWORD_MAX_LEN, { message: PASSWORD_TOO_LONG }),
});

export const patchPreferencesBodySchema = z
  .object({
    goal: z.enum(["JOB", "WORK", "FUN", "PROJECT"]),
    experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]),
    dailyCommitmentMinutes: z.number().int().refine((value) => value === 10 || value === 15 || value === 25),
    notificationsEnabled: z.boolean(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "At least one preference field is required" })
  .refine((body) => !((body.goal || body.dailyCommitmentMinutes) && !body.experienceLevel), {
    message: "experienceLevel is required when updating goal or dailyCommitmentMinutes",
  });

export const deleteAccountBodySchema = z.object({ confirmation: z.literal("DELETE") });

export const postPracticeLogBodySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  practicedSeconds: z.number().int().min(1).max(60 * 60),
});

export const patchAvatarBodySchema = z.object({ avatarUrl: z.string().url() });

export const progressSummaryQuerySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type PatchProfileBody = z.infer<typeof patchProfileBodySchema>;
export type PostChangePasswordBody = z.infer<typeof postChangePasswordBodySchema>;
export type PatchPreferencesBody = z.infer<typeof patchPreferencesBodySchema>;
export type PostPracticeLogBody = z.infer<typeof postPracticeLogBodySchema>;
export type PatchAvatarBody = z.infer<typeof patchAvatarBodySchema>;
export type ProgressSummaryQuery = z.infer<typeof progressSummaryQuerySchema>;
