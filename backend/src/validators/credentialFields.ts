import { z } from "zod";
import {
  EMAIL_INVALID,
  EMAIL_MAX_LEN,
  EMAIL_MIN_LEN,
  EMAIL_TOO_LONG,
  EMAIL_TOO_SHORT,
  normalizeEmail,
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
  PASSWORD_TOO_LONG,
  PASSWORD_TOO_SHORT,
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
  USERNAME_TOO_LONG,
  USERNAME_TOO_SHORT,
} from "@project/user-credentials";

/** Single source of truth for every email field: trimmed and lower-cased so one mailbox is one account. */
export const emailField = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.string().min(EMAIL_MIN_LEN, { message: EMAIL_TOO_SHORT }).max(EMAIL_MAX_LEN, { message: EMAIL_TOO_LONG }).email({ message: EMAIL_INVALID }));

export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LEN, { message: PASSWORD_TOO_SHORT })
  .max(PASSWORD_MAX_LEN, { message: PASSWORD_TOO_LONG });

export const usernameField = z
  .string()
  .min(USERNAME_MIN_LEN, { message: USERNAME_TOO_SHORT })
  .max(USERNAME_MAX_LEN, { message: USERNAME_TOO_LONG });

export const otpCodeField = z.string().regex(/^\d{6}$/, { message: "Code must be 6 digits" });
