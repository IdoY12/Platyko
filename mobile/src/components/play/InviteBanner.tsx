import { StyleSheet } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector } from "@/redux/hooks";
import { depth, palette, radii, SCREEN_MARGIN, space } from "@/theme/tokens";
import { InviteCard } from "./InviteCard";

/**
 * The in-app banner for a game invitation that arrives while the learner is online (PRD 11.3).
 * It shows the newest one over any tab, never over a running game; the rest wait in the inbox.
 */
export function InviteBanner() {
  const insets = useSafeAreaInsets();
  const invite = useAppSelector((state) => (state.play.match && !state.play.end ? null : state.play.invites[0]));
  if (!invite) return null;
  return (
    <Animated.View key={invite.inviteId} entering={SlideInUp} exiting={SlideOutUp} style={[styles.banner, { top: insets.top + space.sm }]} accessibilityViewIsModal={false} accessibilityLiveRegion="polite">
      <InviteCard invite={invite} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: SCREEN_MARGIN,
    right: SCREEN_MARGIN,
    padding: space.lg,
    borderRadius: radii.card,
    backgroundColor: palette.bg.raised,
    borderWidth: 1,
    borderColor: palette.brand.primary,
    ...depth.floating,
  },
});
