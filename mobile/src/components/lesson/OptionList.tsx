import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/common/AppText/AppText";
import { t } from "@/i18n/translate";
import { haptic } from "@/theme/haptics";
import { MIN_TOUCH_TARGET, palette, radii, space, transitions, wash } from "@/theme/tokens";
import { LtrView } from "@/components/common/AppText/LtrView";

export type OptionVerdict = "correct" | "wrong" | null;

type Props = {
  options: readonly string[];
  selectedIndex: number | null;
  /** Shown after checking: the chosen option's verdict, and the right one once it is revealed. */
  verdicts: Partial<Record<number, OptionVerdict>>;
  /** Code and values read left to right in a monospaced face; prose options use the interface font. */
  optionsAreCode: boolean;
  disabled: boolean;
  onSelect: (index: number) => void;
};

const SHAKE_DISTANCE = 8;
const SHAKE_STEP_MS = 50;

function OptionCard({ text, index, selected, verdict, optionsAreCode, disabled, onSelect }: {
  text: string;
  index: number;
  selected: boolean;
  verdict: OptionVerdict;
  optionsAreCode: boolean;
  disabled: boolean;
  onSelect: (index: number) => void;
}) {
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  useEffect(() => {
    if (verdict !== "wrong") return;
    // A short shake says "no" without words; Reduce Motion skips it and leaves the colour and icon.
    shake.set(
      withSequence(
        withTiming(SHAKE_DISTANCE, { duration: SHAKE_STEP_MS }),
        withTiming(-SHAKE_DISTANCE, { duration: SHAKE_STEP_MS }),
        withTiming(SHAKE_DISTANCE / 2, { duration: SHAKE_STEP_MS }),
        withTiming(0, { duration: SHAKE_STEP_MS }),
      ),
    );
  }, [shake, verdict]);

  const border = verdict === "correct" ? palette.state.success : verdict === "wrong" ? palette.state.danger : selected ? palette.brand.primary : palette.line.subtle;
  const background = verdict === "correct" ? wash.success : verdict === "wrong" ? wash.danger : selected ? wash.primary : palette.bg.surface;
  const stateLabel = verdict === "correct" ? t("answer.correct") : verdict === "wrong" ? t("answer.wrong") : selected ? t("answer.selected") : "";

  return (
    <Animated.View style={shakeStyle}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={stateLabel ? `${text}, ${stateLabel}` : text}
        disabled={disabled}
        onPress={() => {
          haptic.selection();
          onSelect(index);
        }}
      >
        <Animated.View style={[styles.card, transitions.colour, { borderColor: border, backgroundColor: background }]}>
          {optionsAreCode ? (
            <LtrView style={styles.content}>
              <AppText variant="code" align="ltr" style={styles.text}>
                {text}
              </AppText>
            </LtrView>
          ) : (
            <View style={styles.content}>
              <AppText variant="body" style={styles.text}>
                {text}
              </AppText>
            </View>
          )}
          {verdict ? (
            <MaterialCommunityIcons
              name={verdict === "correct" ? "check-circle" : "close-circle"}
              size={24}
              color={verdict === "correct" ? palette.state.success : palette.state.danger}
            />
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Three answer cards (PRD 12.6): default, selected, correct with a tick, wrong with a shake. Colour never carries meaning alone. */
export function OptionList({ options, selectedIndex, verdicts, optionsAreCode, disabled, onSelect }: Props) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t("answer.pickOne")} style={styles.list}>
      {options.map((text, index) => (
        <OptionCard
          key={`${index}-${text}`}
          text={text}
          index={index}
          selected={selectedIndex === index}
          verdict={verdicts[index] ?? null}
          optionsAreCode={optionsAreCode}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  card: {
    minHeight: MIN_TOUCH_TARGET + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.button,
    borderWidth: 2,
  },
  content: { flex: 1 },
  text: { flexShrink: 1 },
});
