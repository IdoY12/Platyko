import { z } from "zod";
import {
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
  PASSWORD_TOO_LONG,
  PASSWORD_TOO_SHORT,
} from "@project/user-credentials";
import { emailField, otpCodeField } from "./emailVerificationValidators.js";

export const requestPasswordResetBodySchema = z.object({
  email: emailField,
});

export const confirmPasswordResetBodySchema = z.object({
  email: emailField,
  code: otpCodeField,
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LEN, { message: PASSWORD_TOO_SHORT })
    .max(PASSWORD_MAX_LEN, { message: PASSWORD_TOO_LONG }),
});

export type RequestPasswordResetBody = z.infer<typeof requestPasswordResetBodySchema>;
export type ConfirmPasswordResetBody = z.infer<typeof confirmPasswordResetBodySchema>;
