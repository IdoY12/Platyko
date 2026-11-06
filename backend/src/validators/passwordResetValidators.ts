import { z } from "zod";
import { emailField, otpCodeField, passwordField } from "./credentialFields.js";

export const requestPasswordResetBodySchema = z.object({
  email: emailField,
});

export const confirmPasswordResetBodySchema = z.object({
  email: emailField,
  code: otpCodeField,
  newPassword: passwordField,
});

export type RequestPasswordResetBody = z.infer<typeof requestPasswordResetBodySchema>;
export type ConfirmPasswordResetBody = z.infer<typeof confirmPasswordResetBodySchema>;
