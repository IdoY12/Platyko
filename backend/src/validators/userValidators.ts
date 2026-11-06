import { z } from "zod";
import { passwordField, usernameField } from "./credentialFields.js";

export const patchProfileBodySchema = z.object({
  username: usernameField.optional(),
});

export const postChangePasswordBodySchema = z.object({
  currentPassword: passwordField,
  newPassword: passwordField,
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
