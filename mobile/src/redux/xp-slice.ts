import { MAX_XP_TOTAL, levelFromXpTotal } from "@project/xp-constants";
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
      state.level = levelFromXpTotal(state.xpTotal);
    },
    hydrateXp: (state, action: PayloadAction<Partial<XpState>>) => {
      Object.assign(state, action.payload);
    },
    resetXp: () => initialState,
  },
});

export const { addXp, hydrateXp, resetXp } = xpSlice.actions;

export default xpSlice.reducer;
