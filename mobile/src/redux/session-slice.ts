import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getStreakCalendarDate } from "@/utils/streakCalendar";

/** Why the signed-in account could not be loaded at launch; the banner shows it in the UI language. */
export type BootstrapProblem = "server" | "offline" | "keychain";

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
  bootstrapProblem: BootstrapProblem | null;
}

const initialState: SessionState = {
  hasHydrated: false,
  authChecked: false,
  isAuthenticated: false,
  isGuest: true,
  accessToken: null,
  refreshToken: null,
  userId: null,
  studyDateKey: getStreakCalendarDate(),
  studySecondsToday: 0,
  bootstrapProblem: null,
};

type SignInPayload = { userId: string; accessToken: string; refreshToken: string };

function rollStudyCalendarIfNeeded(state: SessionState) {
  const dateKey = getStreakCalendarDate();
  if (state.studyDateKey !== dateKey) {
    state.studyDateKey = dateKey;
    state.studySecondsToday = 0;
  }
}

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    hydrateSession: (state, a: PayloadAction<Partial<SessionState>>) => void Object.assign(state, a.payload),
    setHasHydrated: (state, a: PayloadAction<boolean>) => void (state.hasHydrated = a.payload),
    setAuthChecked: (state, a: PayloadAction<boolean>) => void (state.authChecked = a.payload),
    reconcileStudyCalendarDay: (state) => rollStudyCalendarIfNeeded(state),
    addStudySeconds: (state, a: PayloadAction<number>) => {
      rollStudyCalendarIfNeeded(state);
      state.studySecondsToday += a.payload;
    },
    signIn: (state, a: PayloadAction<SignInPayload>) => {
      const { userId, accessToken, refreshToken } = a.payload;
      Object.assign(state, { isAuthenticated: true, isGuest: false, userId, accessToken, refreshToken, bootstrapProblem: null });
    },
    setBootstrapProblem: (state, a: PayloadAction<BootstrapProblem | null>) => void (state.bootstrapProblem = a.payload),
    signOut: (state) => ({ ...initialState, hasHydrated: state.hasHydrated, authChecked: true }),
    updateTokens: (state, a: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
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
  signIn,
  signOut,
  updateTokens,
  setBootstrapProblem,
} = sessionSlice.actions;

export default sessionSlice.reducer;
