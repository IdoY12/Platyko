import { z } from "zod";
import {
  EMAIL_INVALID,
  EMAIL_MAX_LEN,
  EMAIL_MIN_LEN,
  EMAIL_TOO_LONG,
  EMAIL_TOO_SHORT,
} from "@project/user-credentials";

export const emailField = z
  .string()
  .min(EMAIL_MIN_LEN, { message: EMAIL_TOO_SHORT })
  .max(EMAIL_MAX_LEN, { message: EMAIL_TOO_LONG })
  .email({ message: EMAIL_INVALID });

export const otpCodeField = z.string().regex(/^\d{6}$/, { message: "Code must be 6 digits" });

/** Issued by /auth/register; proves the caller owns the pending row (see PendingRegistration). */
const registrationTokenField = z.string().min(1, { message: "Registration token is required" });

export const verifyEmailBodySchema = z.object({
  email: emailField,
  code: otpCodeField,
  registrationToken: registrationTokenField,
});

export const resendVerificationBodySchema = z.object({
  email: emailField,
  registrationToken: registrationTokenField,
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type ResendVerificationBody = z.infer<typeof resendVerificationBodySchema>;
