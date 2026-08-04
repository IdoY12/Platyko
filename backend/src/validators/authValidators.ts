import { z } from "zod";
import {
  EMAIL_INVALID,
  EMAIL_MAX_LEN,
  EMAIL_MIN_LEN,
  EMAIL_TOO_LONG,
  EMAIL_TOO_SHORT,
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
  PASSWORD_TOO_LONG,
  PASSWORD_TOO_SHORT,
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
  USERNAME_TOO_LONG,
  USERNAME_TOO_SHORT,
} from "@project/user-credentials";
import { MAX_XP_TOTAL } from "@project/xp-constants";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Guest local-progress snapshot fields shared by register and Google sign-in bodies. */
const guestSnapshotShape = {
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]).optional(),
  goal: z.enum(["JOB", "WORK", "FUN", "PROJECT"]).optional(),
  dailyCommitmentMinutes: z.number().int().refine((v) => v === 10 || v === 15 || v === 25).optional(),
  blockProgress: z
    .partialRecord(z.enum(["JUNIOR", "MID", "SENIOR"]), z.record(z.string(), z.number().int().min(0).max(9)))
    .optional(),
  xpTotal: z.number().int().min(0).max(MAX_XP_TOTAL).optional(),
  streakCurrent: z.number().int().min(0).max(365).optional(),
  streakLastActivityDate: z.string().regex(dateRegex).optional(),
  streakLastCheckedDate: z.string().regex(dateRegex).optional(),
  notificationsEnabled: z.boolean().optional(),
  puzzleXpSolveCounts: z.record(z.string(), z.number().int().min(0)).optional(),
};

export const registerBodySchema = z.object({
  email: z
    .string()
    .min(EMAIL_MIN_LEN, { message: EMAIL_TOO_SHORT })
    .max(EMAIL_MAX_LEN, { message: EMAIL_TOO_LONG })
    .email({ message: EMAIL_INVALID }),
  username: z
    .string()
    .min(USERNAME_MIN_LEN, { message: USERNAME_TOO_SHORT })
    .max(USERNAME_MAX_LEN, { message: USERNAME_TOO_LONG }),
  password: z
    .string()
    .min(PASSWORD_MIN_LEN, { message: PASSWORD_TOO_SHORT })
    .max(PASSWORD_MAX_LEN, { message: PASSWORD_TOO_LONG }),
  ...guestSnapshotShape,
});

export const loginBodySchema = z.object({
  email: z
    .string()
    .min(EMAIL_MIN_LEN, { message: EMAIL_TOO_SHORT })
    .max(EMAIL_MAX_LEN, { message: EMAIL_TOO_LONG })
    .email({ message: EMAIL_INVALID }),
  password: z
    .string()
    .min(PASSWORD_MIN_LEN, { message: PASSWORD_TOO_SHORT })
    .max(PASSWORD_MAX_LEN, { message: PASSWORD_TOO_LONG }),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

export const googleAuthBodySchema = z.object({
  idToken: z.string().min(1, { message: "ID token is required" }),
  ...guestSnapshotShape,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type GoogleAuthBody = z.infer<typeof googleAuthBodySchema>;
