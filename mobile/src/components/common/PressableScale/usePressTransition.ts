import { useReducedMotion } from "react-native-reanimated";
import { transitions } from "@/theme/tokens";

/**
 * The press transition, or none with Reduce Motion on: the pressed look then changes at once
 * (PRD 20.7: no animation beyond a fade). CSS transitions do not follow the system setting by themselves.
 */
export function usePressTransition() {
  return useReducedMotion() ? null : transitions.press;
}
