import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PuzzleXpSolveCounts } from "@project/xp-constants";
import type { Puzzle } from "@/services/auth-aware/PuzzleService";

interface PuzzleState {
  /** Session cache (not persisted): re-fetched on every launch. */
  allPuzzles: Puzzle[] | null;
  xpSolveCounts: PuzzleXpSolveCounts;
}

const initialState: PuzzleState = { allPuzzles: null, xpSolveCounts: {} };

const puzzleSlice = createSlice({
  name: "puzzle",
  initialState,
  reducers: {
    setCachedAllPuzzles: (state, action: PayloadAction<Puzzle[]>) => {
      state.allPuzzles = action.payload;
    },
    incrementPuzzleXpSolveCount: (state, action: PayloadAction<number>) => {
      const key = String(action.payload);
      state.xpSolveCounts[key] = (state.xpSolveCounts[key] ?? 0) + 1;
    },
    hydratePuzzle: (state, action: PayloadAction<Partial<PuzzleState>>) => {
      Object.assign(state, action.payload);
    },
    resetPuzzle: () => initialState,
  },
});

export const { setCachedAllPuzzles, incrementPuzzleXpSolveCount, hydratePuzzle, resetPuzzle } = puzzleSlice.actions;
export default puzzleSlice.reducer;
