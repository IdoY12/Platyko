import { MAX_XP_TOTAL, XP_PER_CORRECT_EXERCISE } from "@project/xp-constants";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface XpState {
  level: number;
  xpTotal: number;
}

const initialState: XpState = {
  level: 1,
  xpTotal: 0,
};

const xpSlice = createSlice({
  name: "xp",
  initialState,
  reducers: {
    addXp: (state, action: PayloadAction<number>) => {
      state.xpTotal = Math.min(state.xpTotal + action.payload, MAX_XP_TOTAL);
      state.level = Math.max(1, Math.floor(state.xpTotal / XP_PER_CORRECT_EXERCISE) + 1);
    },
    hydrateXp: (state, action: PayloadAction<Partial<XpState>>) => {
      Object.assign(state, action.payload);
    },
    resetXp: () => initialState,
  },
});

export const { addXp, hydrateXp, resetXp } = xpSlice.actions;

export default xpSlice.reducer;
