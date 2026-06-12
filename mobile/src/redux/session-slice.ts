import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface SessionState {
  hasHydrated: boolean;
  authChecked: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  studyDateKey: string;
  studySecondsToday: number;
  bootstrapError: string | null;
}

const initialState: SessionState = {
  hasHydrated: false,
  authChecked: false,
  isAuthenticated: false,
  isGuest: true,
  accessToken: null,
  refreshToken: null,
  userId: null,
  studyDateKey: new Date().toLocaleDateString("en-CA"),
  studySecondsToday: 0,
  bootstrapError: null,
};

type SignInPayload = {
  userId: string;
  accessToken: string;
  refreshToken: string;
};

function rollStudyCalendarIfNeeded(state: SessionState) {
  const dateKey = new Date().toLocaleDateString("en-CA");
  if (state.studyDateKey !== dateKey) {
    state.studyDateKey = dateKey;
    state.studySecondsToday = 0;
  }
}

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    hydrateSession: (
      state,
      a: PayloadAction<Partial<SessionState> & { hasCompletedOnboarding?: unknown }>,
    ) => {
      const { hasCompletedOnboarding: _legacyOnboardingRemoved, ...rest } = a.payload;
      Object.assign(state, rest);
    },

    setHasHydrated: (state, a: PayloadAction<boolean>) => {
      state.hasHydrated = a.payload;
    },

    setAuthChecked: (state, a: PayloadAction<boolean>) => {
      state.authChecked = a.payload;
    },

    reconcileStudyCalendarDay: (state) => {
      rollStudyCalendarIfNeeded(state);
    },

    addStudySeconds: (state, a: PayloadAction<number>) => {
      rollStudyCalendarIfNeeded(state);
      state.studySecondsToday += a.payload;
    },

    enterGuestMode: (state) => {
      Object.assign(state, {
        isAuthenticated: false,
        isGuest: true,
        accessToken: null,
        refreshToken: null,
        userId: null,
      });
    },

    signIn: (state, a: PayloadAction<SignInPayload>) => {
      const { userId, accessToken, refreshToken } = a.payload;
      Object.assign(state, {
        isAuthenticated: true,
        isGuest: false,
        userId,
        accessToken,
        refreshToken,
        bootstrapError: null,
      });
    },

    setBootstrapError: (state, a: PayloadAction<string | null>) => {
      state.bootstrapError = a.payload;
    },

    signOut: (state) => {
      const h = state.hasHydrated;
      return { ...initialState, hasHydrated: h, authChecked: true };
    },

    updateTokens: (
      state,
      a: PayloadAction<{ accessToken: string; refreshToken: string }>,
    ) => {
      state.accessToken = a.payload.accessToken;
      state.refreshToken = a.payload.refreshToken;
    },
  },
});

export const {
  hydrateSession,
  setHasHydrated,
  setAuthChecked,
  reconcileStudyCalendarDay,
  addStudySeconds,
  enterGuestMode,
  signIn,
  signOut,
  updateTokens,
  setBootstrapError,
} = sessionSlice.actions;

export default sessionSlice.reducer;