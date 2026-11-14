/**
 * The guest's preferences sent with register, Google and Apple sign-up. Progress is never sent
 * here as numbers: the guest's attempts go to the guest-merge endpoint after sign-in, and the
 * server recomputes XP and streak from them (PRD 10.2).
 */
import type { RootState } from "@/redux/store";

export type GuestLocalState = { experienceLevel?: string; goal?: string; commitment?: string; notificationsEnabled?: boolean };

export function buildGuestLocalState({ profile }: RootState): GuestLocalState {
  return { experienceLevel: profile.experienceLevel, goal: profile.goal, commitment: profile.commitment, notificationsEnabled: profile.notificationsEnabled };
}

export function guestStateRequestBody(local?: GuestLocalState) {
  return {
    experienceLevel: local?.experienceLevel,
    goal: local?.goal,
    dailyCommitmentMinutes: local?.commitment ? Number(local.commitment) : undefined,
    notificationsEnabled: local?.notificationsEnabled,
  };
}
