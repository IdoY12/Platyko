import { z } from "zod";
import { USERNAME_MAX_LEN } from "@project/user-credentials";
import { guestSnapshotShape } from "./authValidators.js";

/**
 * fullName is only provided by Apple on the FIRST authorization. The email is deliberately NOT
 * accepted from the client: it is read from the verified identity token only, so a caller can never
 * claim someone else's address and get linked to (or squat on) their account.
 */
export const appleAuthBodySchema = z.object({
  identityToken: z.string().min(1, { message: "Identity token is required" }),
  fullName: z.string().max(USERNAME_MAX_LEN * 2).optional(),
  ...guestSnapshotShape,
});

export type AppleAuthBody = z.infer<typeof appleAuthBodySchema>;
