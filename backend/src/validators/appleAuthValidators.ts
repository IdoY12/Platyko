import { z } from "zod";
import { EMAIL_INVALID, EMAIL_MAX_LEN, USERNAME_MAX_LEN } from "@project/user-credentials";
import { guestSnapshotShape } from "./authValidators.js";

/** fullName/email are only provided by Apple on the FIRST authorization; both optional. */
export const appleAuthBodySchema = z.object({
  identityToken: z.string().min(1, { message: "Identity token is required" }),
  fullName: z.string().max(USERNAME_MAX_LEN * 2).optional(),
  email: z.string().max(EMAIL_MAX_LEN).email({ message: EMAIL_INVALID }).optional(),
  ...guestSnapshotShape,
});

export type AppleAuthBody = z.infer<typeof appleAuthBodySchema>;
