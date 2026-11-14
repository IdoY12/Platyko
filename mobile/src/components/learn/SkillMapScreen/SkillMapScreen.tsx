import { useCallback, useMemo } from "react";
import { RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { TRACKS, type Track } from "@project/content-model";
import { isTrackUnlocked, lessonStatesOf, summaryLessonId, type MapUnit } from "@project/learning-logic";
import { AppText } from "@/components/common/AppText/AppText";
import { AmbientRiver } from "@/components/common/Screen/AmbientRiver";
import { Surface } from "@/components/common/Surface/Surface";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { learnerProgressOf } from "@/redux/learning-selectors";
import { refreshContentMap } from "@/redux/learning-sync";
import { t } from "@/i18n/translate";
import { palette, SCREEN_MARGIN, space } from "@/theme/tokens";
import type { RootNavigation } from "@/types/rootNavigation.types";
import { LessonNode } from "./LessonNode";

/** Each node sits left, centre or right of the river in turn, so the path winds down the unit. */
const NODE_OFFSETS = [0, 0.32, 0, -0.32, 0];
const ROW_HEIGHT = 150;
/** The far layer moves slowest; together the three layers give depth without 3D rendering (PRD 12.8). */
const FAR_LAYER_SPEED = 0.25;
const MIDDLE_LAYER_SPEED = 0.55;

function UnitPath({ width, count }: { width: number; count: number }) {
  const points = Array.from({ length: count }, (_unused, index) => ({ x: width / 2 + NODE_OFFSETS[index % NODE_OFFSETS.length] * width, y: index * ROW_HEIGHT + 48 }));
  const path = points.reduce((built, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const middleY = (previous.y + point.y) / 2;
    return `${built} C ${previous.x} ${middleY} ${point.x} ${middleY} ${point.x} ${point.y}`;
  }, "");
  return (
    <Svg width={width} height={count * ROW_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={path} stroke="rgba(33,230,245,0.22)" strokeWidth={14} fill="none" strokeLinecap="round" />
      <Path d={path} stroke="rgba(182,184,222,0.35)" strokeWidth={3} strokeDasharray="2 12" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function UnitSection({ unit, width, onOpen }: { unit: MapUnit; width: number; onOpen: (lessonId: string) => void }) {
  const map = useAppSelector((state) => state.learning.map);
  const progress = useAppSelector((state) => state.learning.progress);
  const resume = useAppSelector((state) => state.learning.resume);
  const learner = useMemo(() => learnerProgressOf(progress, resume), [progress, resume]);
  const states = lessonStatesOf(map?.units ?? [], unit, learner);
  const done = states.filter((state) => state === "completed" || state === "mastered").length;
  const pathWidth = width - SCREEN_MARGIN * 2;

  return (
    <View style={styles.unit}>
      <Surface style={styles.unitHeader}>
        <AppText variant="cardTitle" align="ltr" accessibilityRole="header">
          {unit.title}
        </AppText>
        <AppText variant="label" color={palette.text.secondary}>
          {t("map.unitProgress", { done, total: unit.lessons.length })}
        </AppText>
      </Surface>
      <View style={{ height: unit.lessons.length * ROW_HEIGHT }}>
        <UnitPath width={pathWidth} count={unit.lessons.length} />
        {unit.lessons.map((lesson, index) => {
          const position = resume?.lessonId === lesson.id ? resume.session.position / Math.max(1, resume.session.slots.length) : 0;
          return (
            <View key={lesson.id} style={[styles.nodeRow, { top: index * ROW_HEIGHT, transform: [{ translateX: NODE_OFFSETS[index % NODE_OFFSETS.length] * pathWidth }] }]}>
              <LessonNode
                title={lesson.id === summaryLessonId(unit.unit) ? t("map.summaryLesson") : lesson.title ?? t("map.lessonNumber", { number: index + 1 })}
                state={states[index]}
                progress={position}
                onPress={() => onOpen(lesson.id)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** The Learn tab (PRD 6.2, 16.1): one continuous map of four tracks, units in order, five lesson states. */
export function SkillMapScreen() {
  const navigation = useNavigation<RootNavigation>();
  const dispatch = useAppDispatch();
  const { width, height } = useWindowDimensions();
  const map = useAppSelector((state) => state.learning.map);
  const progress = useAppSelector((state) => state.learning.progress);
  const resume = useAppSelector((state) => state.learning.resume);
  const reducedMotion = useReducedMotion();
  const scrollY = useSharedValue(0);
  const learner = useMemo(() => learnerProgressOf(progress, resume), [progress, resume]);

  useFocusEffect(
    useCallback(() => {
      void refreshContentMap(dispatch);
    }, [dispatch]),
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const farLayer = useAnimatedStyle(() => ({ transform: [{ translateY: reducedMotion ? 0 : -scrollY.get() * FAR_LAYER_SPEED }] }));
  const middleLayer = useAnimatedStyle(() => ({ transform: [{ translateY: reducedMotion ? 0 : -scrollY.get() * MIDDLE_LAYER_SPEED }] }));

  const tracks = TRACKS.map((track) => ({ track, units: (map?.units ?? []).filter((unit) => unit.track === track) })).filter((group) => group.units.length > 0);
  const openLesson = (lessonId: string) => navigation.navigate("LessonPlayer", { lessonId });

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { height: height * 2 }, farLayer]} pointerEvents="none">
        <AmbientRiver active />
      </Animated.View>
      <Animated.View style={[styles.middleLayer, middleLayer]} pointerEvents="none">
        {Array.from({ length: 12 }, (_unused, index) => (
          <View key={index} style={[styles.bank, { top: index * 420 + 120, [index % 2 === 0 ? "left" : "right"]: -60 }]} />
        ))}
      </Animated.View>
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refreshContentMap(dispatch)} tintColor={palette.brand.primary} />}
        >
          <AppText variant="screenTitle" accessibilityRole="header">
            {t("map.title")}
          </AppText>
          {tracks.length === 0 ? <AppText color={palette.text.secondary}>{t("map.empty")}</AppText> : null}
          {tracks.map(({ track, units }: { track: Track; units: MapUnit[] }) => (
            <View key={track} style={styles.track}>
              <AppText variant="label" color={palette.brand.glow}>
                {t(`map.track.${track}`)}
              </AppText>
              {!isTrackUnlocked(map?.units ?? [], track, learner) ? (
                <AppText variant="body" color={palette.text.muted}>
                  {t("map.trackLocked")}
                </AppText>
              ) : null}
              {units.map((unit) => (
                <UnitSection key={unit.unit} unit={unit} width={width} onOpen={openLesson} />
              ))}
            </View>
          ))}
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg.base },
  middleLayer: { ...StyleSheet.absoluteFillObject },
  bank: { position: "absolute", width: 180, height: 260, borderRadius: 130, backgroundColor: "rgba(27,30,85,0.55)" },
  content: { paddingHorizontal: SCREEN_MARGIN, paddingBottom: 140, gap: space.xl },
  track: { gap: space.lg },
  unit: { gap: space.lg },
  unitHeader: { gap: space.xs },
  nodeRow: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
