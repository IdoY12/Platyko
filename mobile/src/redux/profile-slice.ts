import type { AuthProviderName } from "@project/api-contract";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type Goal = "JOB" | "WORK" | "FUN" | "PROJECT";

/** The identity fields every account payload (/auth/me, login, profile) carries, in setUserIdentity shape. */
export const identityOf = (u: { username: string; email: string; avatarUrl?: string | null; hasPassword: boolean; authProvider: AuthProviderName | null; githubLogin: string | null }) =>
  ({ username: u.username, email: u.email, avatarUrl: u.avatarUrl ?? null, hasPassword: u.hasPassword, authProvider: u.authProvider, githubLogin: u.githubLogin });
type Experience = "JUNIOR" | "MID" | "SENIOR";
export type Commitment = "10" | "15" | "25";

type ProfileState = {
  username: string;
  email: string;
  avatarUrl: string | null;
  goal?: Goal;
  experienceLevel?: Experience;
  commitment: Commitment;
  notificationsEnabled: boolean;
  hasPassword: boolean;
  authProvider: AuthProviderName | null;
  /** The linked GitHub username, or null (PRD 14.3). */
  githubLogin: string | null;
};

const initialState: ProfileState = {
  username: "Coder",
  email: "",
  avatarUrl: null,
  commitment: "15",
  experienceLevel: "JUNIOR",
  notificationsEnabled: true,
  // Assumed until a server payload says otherwise.
  hasPassword: true,
  authProvider: null,
  githubLogin: null,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    hydrateProfile: (state, a: PayloadAction<Partial<ProfileState>>) => {
      Object.assign(state, a.payload);
    },
    resetProfile: () => initialState,
    setUserIdentity: (state, a: PayloadAction<Partial<Pick<ProfileState, "username" | "email" | "avatarUrl" | "hasPassword" | "authProvider" | "githubLogin">>>) => {
      for (const [key, value] of Object.entries(a.payload))
        if (value !== undefined) (state as unknown as Record<string, unknown>)[key] = value;
    },
    updatePreferences: (
      state,
      a: PayloadAction<{ goal: Goal; experienceLevel: Experience; commitment: Commitment; notificationsEnabled: boolean }>,
    ) => void Object.assign(state, a.payload),
    setNotificationsEnabled: (s, a: PayloadAction<boolean>) => void (s.notificationsEnabled = a.payload),
  },
});

export const {
  hydrateProfile,
  resetProfile,
  setUserIdentity,
  updatePreferences,
  setNotificationsEnabled,
} = profileSlice.actions;

export default profileSlice.reducer;
