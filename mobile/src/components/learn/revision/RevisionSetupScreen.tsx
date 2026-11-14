import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TRACKS } from "@project/content-model";
import { isUnitUnlocked, REVISION_LENGTHS, revisionId } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { LipButton } from "@/components/common/LipButton/LipButton";
import { PressableScale } from "@/components/common/PressableScale/PressableScale";
import { Screen } from "@/components/common/Screen/Screen";
import { ScreenHeader } from "@/components/common/Screen/ScreenHeader";
import { Surface } from "@/components/common/Surface/Surface";
import { useAppSelector } from "@/redux/hooks";
import { learnerProgressOf } from "@/redux/learning-selectors";
import { t } from "@/i18n/translate";
import { MIN_TOUCH_TARGET, palette, radii, space, wash } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";

/** Revision setup (PRD 5.1 L9, 16.1): the units reached so far, a length, then one mixed session. */
export function RevisionSetupScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { map, progress, resume } = useAppSelector((state) => state.learning);
  const learner = useMemo(() => learnerProgressOf(progress, resume), [progress, resume]);
  const reached = (map?.units ?? []).filter((unit) => isUnitUnlocked(map?.units ?? [], unit, learner));
  const [chosen, setChosen] = useState<string[]>([]);
  const [length, setLength] = useState<number>(REVISION_LENGTHS[0]);
  const toggle = (unit: string) => setChosen((current) => (current.includes(unit) ? current.filter((other) => other !== unit) : [...current, unit]));

  return (
    <Screen scrollable contentStyle={styles.content}>
      <ScreenHeader title={t("revision.title")} />
      <AppText color={palette.text.secondary}>{reached.length > 0 ? t("revision.body") : t("revision.none")}</AppText>
      {TRACKS.map((track) => {
        const units = reached.filter((unit) => unit.track === track);
        if (units.length === 0) return null;
        return (
          <View key={track} style={styles.group}>
            <AppText variant="label" color={palette.brand.glow}>
              {t(`map.track.${track}`)}
            </AppText>
            {units.map((unit) => {
              const selected = chosen.includes(unit.unit);
              return (
                <PressableScale key={unit.unit} onPress={() => toggle(unit.unit)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={unit.title}>
                  <Surface style={[styles.unit, selected && styles.unitSelected]}>
                    <MaterialCommunityIcons name={selected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={24} color={selected ? palette.brand.primary : palette.text.muted} />
                    <AppText variant="bodyStrong" align="ltr" style={styles.unitTitle}>
                      {unit.title}
                    </AppText>
                  </Surface>
                </PressableScale>
              );
            })}
          </View>
        );
      })}
      {reached.length > 0 ? (
        <View style={styles.group}>
          <AppText variant="label" color={palette.text.secondary}>
            {t("revision.length")}
          </AppText>
          <View style={styles.lengths} accessibilityRole="radiogroup">
            {REVISION_LENGTHS.map((option) => (
              <PressableScale key={option} onPress={() => setLength(option)} accessibilityRole="radio" accessibilityState={{ selected: option === length }} style={[styles.length, option === length && styles.lengthSelected]}>
                <AppText variant="label" color={option === length ? palette.text.onBright : palette.text.secondary}>
                  {t("revision.lengthOption", { count: option })}
                </AppText>
              </PressableScale>
            ))}
          </View>
          <LipButton label={t("revision.start")} disabled={chosen.length === 0} onPress={() => navigation.replace("LessonPlayer", { lessonId: revisionId(chosen, length) })} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  group: { gap: space.md },
  unit: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: MIN_TOUCH_TARGET + space.sm, paddingVertical: space.md, borderWidth: 2, borderColor: "transparent" },
  unitSelected: { borderColor: palette.brand.primary, backgroundColor: wash.primary },
  unitTitle: { flex: 1 },
  lengths: { flexDirection: "row", gap: space.md },
  length: { flex: 1, minHeight: MIN_TOUCH_TARGET, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg.raised },
  lengthSelected: { backgroundColor: palette.brand.primary },
});
