import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  applyStreakOnAppOpen,
  applyStreakOnQualifyingXp,
  type DailyXpStreakPersisted,
} from "@/utils/dailyXpStreakCore";

interface StreakState {
  streakCurrent: number;
  lastActivityDate: string | null;
  lastCheckedDate: string | null;
}

const initialState: StreakState = {
  streakCurrent: 0,
  lastActivityDate: null,
  lastCheckedDate: null,
};

function toPersisted(state: StreakState): DailyXpStreakPersisted {
  return {
    streakCount: state.streakCurrent,
    lastActivityDate: state.lastActivityDate,
    lastCheckedDate: state.lastCheckedDate,
  };
}

function assignFromPersisted(state: StreakState, next: DailyXpStreakPersisted): void {
  state.streakCurrent = next.streakCount;
  state.lastActivityDate = next.lastActivityDate;
  state.lastCheckedDate = next.lastCheckedDate;
}

const streakSlice = createSlice({
  name: "streak",
  initialState,
  reducers: {
    hydrateStreak: (state, action: PayloadAction<Partial<StreakState>>) => {
      const payload = action.payload;
      if (typeof payload.streakCurrent === "number") state.streakCurrent = payload.streakCurrent;
      if (payload.lastActivityDate !== undefined) state.lastActivityDate = payload.lastActivityDate;
      if (payload.lastCheckedDate !== undefined) state.lastCheckedDate = payload.lastCheckedDate;
    },
    resetStreak: () => initialState,
    runStreakAppOpen: (state, action: PayloadAction<{ today: string }>) => {
      const next = applyStreakOnAppOpen(toPersisted(state), action.payload.today);
      assignFromPersisted(state, next);
    },
    runStreakQualifyingExercise: (state, action: PayloadAction<{ today: string }>) => {
      const next = applyStreakOnQualifyingXp(toPersisted(state), action.payload.today);
      assignFromPersisted(state, next);
    },
  },
});

export const { hydrateStreak, resetStreak, runStreakAppOpen, runStreakQualifyingExercise } = streakSlice.actions;

export default streakSlice.reducer;
