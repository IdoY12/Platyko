import { StyleSheet, View } from "react-native";
import type { ContentMapResponse } from "@project/api-contract";
import { TRACKS } from "@project/content-model";
import { MASTERED_SCORE, trackCompletion, type ProgressSnapshot } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { LtrView } from "@/components/common/AppText/LtrView";
import { Surface } from "@/components/common/Surface/Surface";
import { learnerProgressOf } from "@/redux/learning-selectors";
import { t } from "@/i18n/translate";
import { palette, radii, space } from "@/theme/tokens";

const CONCEPTS_SHOWN = 3;

/**
 * Track progress and, for the owner only, the strongest and weakest concepts by mastery
 * (PRD 14.1). Concept titles are English content, so they read left to right.
 */
export function ProfileLearning({ map, progress }: { map: ContentMapResponse | null; progress: ProgressSnapshot }) {
  const learner = learnerProgressOf(progress, null);
  const titleOf = new Map((map?.units ?? []).flatMap((unit) => unit.lessons.flatMap((lesson) => (lesson.concept ? [[lesson.concept, lesson.title ?? lesson.concept] as const] : []))));
  const scored = [...progress.concepts].filter((concept) => concept.recentFirstAttempts.length > 0).sort((left, right) => right.score - left.score);
  const strongest = scored.filter((concept) => concept.score >= MASTERED_SCORE).slice(0, CONCEPTS_SHOWN);
  const weakest = scored.filter((concept) => concept.score < MASTERED_SCORE).slice(-CONCEPTS_SHOWN).reverse();

  const conceptList = (title: string, concepts: typeof scored, colour: string) => (
    <View style={styles.conceptGroup}>
      <AppText variant="label" color={palette.text.secondary}>
        {title}
      </AppText>
      {concepts.map((concept) => (
        <LtrView key={concept.concept} style={styles.conceptRow}>
          <AppText variant="bodyStrong" align="ltr" style={styles.conceptTitle} numberOfLines={1}>
            {titleOf.get(concept.concept) ?? concept.concept}
          </AppText>
          <AppText variant="number" align="ltr" color={colour}>
            {concept.score}
          </AppText>
        </LtrView>
      ))}
    </View>
  );

  return (
    <>
      <Surface style={styles.card}>
        <AppText variant="label" color={palette.text.secondary}>
          {t("profile.tracksTitle")}
        </AppText>
        {TRACKS.map((track) => {
          const share = map ? trackCompletion(map.units, track, learner) : 0;
          return (
            <View key={track} style={styles.track} accessible accessibilityLabel={`${t(`map.track.${track}`)}: ${t("profile.trackProgress", { done: Math.round(share * 100) })}`}>
              <View style={styles.trackHeader}>
                <AppText variant="bodyStrong">{t(`map.track.${track}`)}</AppText>
                <AppText variant="label" color={palette.text.secondary}>
                  {t("profile.trackProgress", { done: Math.round(share * 100) })}
                </AppText>
              </View>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </Surface>
      <Surface style={styles.card}>
        {scored.length === 0 ? <AppText color={palette.text.secondary}>{t("profile.noMastery")}</AppText> : null}
        {strongest.length > 0 ? conceptList(t("profile.strengthsTitle"), strongest, palette.state.success) : null}
        {weakest.length > 0 ? conceptList(t("profile.weaknessesTitle"), weakest, palette.brand.primary) : null}
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  track: { gap: space.sm },
  trackHeader: { flexDirection: "row", justifyContent: "space-between" },
  bar: { height: 8, borderRadius: radii.pill, backgroundColor: palette.bg.raised, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radii.pill, backgroundColor: palette.brand.primary },
  conceptGroup: { gap: space.sm },
  conceptRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  conceptTitle: { flex: 1 },
});
