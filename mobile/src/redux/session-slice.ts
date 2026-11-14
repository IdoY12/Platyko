import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

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
  bootstrapProblem: null,
};

type SignInPayload = { userId: string; accessToken: string; refreshToken: string };

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    /**
     * Restores what the snapshot stores, never this launch's progress flags: a snapshot read after
     * the session check (a fast refresh keeps the store) must not undo it or hide a keychain problem.
     */
    hydrateSession: (state, a: PayloadAction<Partial<SessionState>>) => {
      const { isAuthenticated, isGuest, accessToken, refreshToken, userId } = { ...state, ...a.payload };
      Object.assign(state, { isAuthenticated, isGuest, accessToken, refreshToken, userId });
    },
    setHasHydrated: (state, a: PayloadAction<boolean>) => void (state.hasHydrated = a.payload),
    setAuthChecked: (state, a: PayloadAction<boolean>) => void (state.authChecked = a.payload),
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
  signIn,
  signOut,
  updateTokens,
  setBootstrapProblem,
} = sessionSlice.actions;

export default sessionSlice.reducer;
