import { z } from "zod";
import { MAX_XP_TOTAL } from "@project/xp-constants";
import { CALENDAR_DATE_PATTERN } from "@project/streak-logic";
import { emailField, passwordField, usernameField } from "./credentialFields.js";

/** JSON columns on the progress row: a guest can only have touched a few dozen blocks / puzzles. */
const fewKeys = (record: Record<string, unknown>) => Object.keys(record).length <= 200;

/** Guest local-progress snapshot fields shared by register, Google, and Apple sign-in bodies. */
export const guestSnapshotShape = {
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]).optional(),
  goal: z.enum(["JOB", "WORK", "FUN", "PROJECT"]).optional(),
  dailyCommitmentMinutes: z.number().int().refine((v) => v === 10 || v === 15 || v === 25).optional(),
  blockProgress: z
    .partialRecord(z.enum(["JUNIOR", "MID", "SENIOR"]), z.record(z.string().max(32), z.number().int().min(0).max(9)).refine(fewKeys))
    .optional(),
  xpTotal: z.number().int().min(0).max(MAX_XP_TOTAL).optional(),
  streakCurrent: z.number().int().min(0).max(365).optional(),
  streakLastActivityDate: z.string().regex(CALENDAR_DATE_PATTERN).optional(),
  streakLastCheckedDate: z.string().regex(CALENDAR_DATE_PATTERN).optional(),
  notificationsEnabled: z.boolean().optional(),
  puzzleXpSolveCounts: z.record(z.string().max(16), z.number().int().min(0)).refine(fewKeys).optional(),
};

export const registerBodySchema = z.object({
  email: emailField,
  username: usernameField,
  password: passwordField,
  ...guestSnapshotShape,
});

export const loginBodySchema = z.object({
  email: emailField,
  password: passwordField,
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

/** Logout accepts either token; the body is optional and may carry an empty refreshToken. */
export const logoutBodySchema = z.object({
  refreshToken: z.string().max(4096).optional(),
});

export const googleAuthBodySchema = z.object({
  idToken: z.string().min(1, { message: "ID token is required" }),
  ...guestSnapshotShape,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type GoogleAuthBody = z.infer<typeof googleAuthBodySchema>;
