import { z } from "zod";
import {
  EMAIL_INVALID,
  EMAIL_MAX_LEN,
  EMAIL_MIN_LEN,
  EMAIL_TOO_LONG,
  EMAIL_TOO_SHORT,
} from "@project/user-credentials";

const emailField = z
  .string()
  .min(EMAIL_MIN_LEN, { message: EMAIL_TOO_SHORT })
  .max(EMAIL_MAX_LEN, { message: EMAIL_TOO_LONG })
  .email({ message: EMAIL_INVALID });

export const verifyEmailBodySchema = z.object({
  email: emailField,
  code: z.string().regex(/^\d{6}$/, { message: "Code must be 6 digits" }),
});

export const resendVerificationBodySchema = z.object({
  email: emailField,
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type ResendVerificationBody = z.infer<typeof resendVerificationBodySchema>;
