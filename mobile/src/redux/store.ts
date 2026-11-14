import { configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./session-slice";
import profileReducer from "./profile-slice";
import xpReducer from "./xp-slice";
import streakReducer from "./streak-slice";
import learningReducer from "./learning-slice";
import playReducer from "./play-slice";

const store = configureStore({
  reducer: {
    session: sessionReducer,
    profile: profileReducer,
    xp: xpReducer,
    streak: streakReducer,
    learning: learningReducer,
    play: playReducer,
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
