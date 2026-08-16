import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useDuelSocketBootstrap } from "@/hooks/useDuelSocket";
import { colors } from "@/theme/theme";
import type { DuelStackParamList } from "@/types/duelNavigation.types";
import { DuelActiveDuelScreen } from "./DuelActiveDuelScreen";
import { DuelHomeScreen } from "./DuelHomeScreen";
import { DuelMatchmakingScreen } from "./DuelMatchmakingScreen";
import { DuelResultsScreen } from "./DuelResultsScreen";

const Stack = createNativeStackNavigator<DuelStackParamList>();

const STACK_OPTIONS = { headerShown: false as const, contentStyle: { backgroundColor: colors.background } };
// gestureEnabled false: an accidental swipe-back mid-duel would forfeit the match;
// leaving is only via the explicit header back / hardware back (which emits leave_duel).
const ACTIVE_DUEL_OPTIONS = { gestureEnabled: false };

/** Screens render their own TerminalHeader — stock navigation headers are disabled. */
export function DuelNavigator() {
  useDuelSocketBootstrap();
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
      <Stack.Screen name="DuelHome" component={DuelHomeScreen} />
      <Stack.Screen name="Matchmaking" component={DuelMatchmakingScreen} />
      <Stack.Screen name="ActiveDuel" component={DuelActiveDuelScreen} options={ACTIVE_DUEL_OPTIONS} />
      <Stack.Screen name="DuelResults" component={DuelResultsScreen} />
    </Stack.Navigator>
  );
}
