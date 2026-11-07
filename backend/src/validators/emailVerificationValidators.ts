import { z } from "zod";
import { emailField, otpCodeField } from "./credentialFields.js";

/** Issued by /auth/register; proves the caller owns the pending row (see PendingRegistration). */
const registrationTokenField = z.string().min(1, { message: "Registration token is required" }).max(128);

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
