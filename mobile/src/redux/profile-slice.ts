import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Goal = "JOB" | "WORK" | "FUN" | "PROJECT";
export type Experience = "JUNIOR" | "MID" | "SENIOR";
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
  authProvider: "google" | "apple" | null;
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
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    hydrateProfile: (state, a: PayloadAction<Partial<ProfileState>>) => {
      Object.assign(state, a.payload);
    },
    resetProfile: () => initialState,
    setUserIdentity: (state, a: PayloadAction<Partial<Pick<ProfileState, "username" | "email" | "avatarUrl" | "hasPassword" | "authProvider">>>) => {
      for (const [key, value] of Object.entries(a.payload))
        if (value !== undefined) (state as unknown as Record<string, unknown>)[key] = value;
    },
    setOnboarding: (state, a: PayloadAction<{ goal: Goal; experienceLevel: Experience; commitment: Commitment }>) => {
      const { goal, experienceLevel, commitment } = a.payload;
      state.goal = goal;
      state.experienceLevel = experienceLevel;
      state.commitment = commitment;
    },
    completeOnboarding: (
      state,
      a: PayloadAction<{ experienceLevel: Experience; goal: Goal; commitment: Commitment; notificationsEnabled: boolean }>,
    ) => {
      const p = a.payload;
      Object.assign(state, {
        experienceLevel: p.experienceLevel,
        goal: p.goal,
        commitment: p.commitment,
        notificationsEnabled: p.notificationsEnabled,
      });
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
  setOnboarding,
  completeOnboarding,
  updatePreferences,
  setNotificationsEnabled,
} = profileSlice.actions;

export default profileSlice.reducer;
