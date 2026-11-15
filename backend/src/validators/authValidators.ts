import { z } from "zod";
import { emailField, passwordField, usernameField } from "./credentialFields.js";
import { LANGUAGES } from "@project/locales";

/**
 * The guest's preferences, shared by register, Google, Apple and GitHub sign-up bodies. Progress is
 * never taken from the client here: the guest's attempts are merged after sign-in and the server
 * computes XP and streak from them (PRD 10.2, criterion 20.4).
 */
export const guestSnapshotShape = {
  experienceLevel: z.enum(["JUNIOR", "MID", "SENIOR"]).optional(),
  goal: z.enum(["JOB", "WORK", "FUN", "PROJECT"]).optional(),
  dailyCommitmentMinutes: z.number().int().refine((v) => v === 10 || v === 15 || v === 25).optional(),
  notificationsEnabled: z.boolean().optional(),
  language: z.enum(LANGUAGES).optional(),
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
  refreshToken: z.string().min(1, { message: "Refresh token is required" }).max(4096),
});

/** Logout accepts either token; the body is optional and may carry an empty refreshToken. */
export const logoutBodySchema = z.object({
  refreshToken: z.string().max(4096).optional(),
});

/** GitHub's authorization code, exchanged on the server with the PKCE verifier (PRD 14.3). */
export const githubAuthBodySchema = z.object({
  code: z.string().min(1).max(512),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z.string().min(1).max(512),
  ...guestSnapshotShape,
});
export type GitHubAuthBody = z.infer<typeof githubAuthBodySchema>;

export const googleAuthBodySchema = z.object({
  idToken: z.string().min(1, { message: "ID token is required" }).max(8192),
  ...guestSnapshotShape,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type GoogleAuthBody = z.infer<typeof googleAuthBodySchema>;
