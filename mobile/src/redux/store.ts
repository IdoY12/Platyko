import { configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./session-slice";
import profileReducer from "./profile-slice";
import xpReducer from "./xp-slice";
import streakReducer from "./streak-slice";
import duelReducer from "./duel-slice";
import duelLiveReducer from "./duel-live-slice";
import learningReducer from "./learning-slice";

const store = configureStore({
  reducer: {
    session: sessionReducer,
    profile: profileReducer,
    xp: xpReducer,
    streak: streakReducer,
    duel: duelReducer,
    duelLive: duelLiveReducer,
    learning: learningReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
